
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, ArrowUpDown, ShieldCheck, Download } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, getDocs, where, limit } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { deleteUser } from "@/ai/flows/delete-user-flow";
import { makeAdmin } from "@/ai/flows/make-admin-flow";
import { manageTeamBySpoc } from "@/ai/flows/manage-team-by-spoc-flow";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportUsers } from "@/ai/flows/export-users-flow";

type SortKey = 'name' | 'email' | 'role' | 'institute' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type RoleFilter = "all" | "leader" | "member";
type StatusFilter = "all" | "registered" | "pending";

async function getUserProfilesInChunks(userIds: string[]): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();
    if (userIds.length === 0) return userProfiles;

    const chunkSize = 30;
    for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        if (chunk.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                userProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
            });
        }
    }
    return userProfiles;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Map<string, Team>>(new Map());
  const [allTeamMembers, setAllTeamMembers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>({ key: 'createdAt', direction: 'desc' });
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const usersQuery = query(collection(db, 'users'), orderBy("name"));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setUsers(usersData);
    }, (error) => {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" });
    });

    const teamsQuery = query(collection(db, 'teams'));
    const unsubscribeTeams = onSnapshot(teamsQuery, async (snapshot) => {
        const teamsData = new Map(snapshot.docs.map(doc => [doc.id, {id: doc.id, ...doc.data()} as Team]));
        setTeams(teamsData);

        const allUserIdsFromTeams = new Set<string>();
        teamsData.forEach(team => {
            allUserIdsFromTeams.add(team.leader.uid);
            team.members.forEach(member => {
                if (member.uid) allUserIdsFromTeams.add(member.uid);
            });
        });

        if (allUserIdsFromTeams.size > 0) {
            const memberProfiles = await getUserProfilesInChunks(Array.from(allUserIdsFromTeams));
            setAllTeamMembers(memberProfiles);
        }
    }, (error) => {
        console.error("Error fetching teams:", error);
        toast({ title: "Error", description: "Failed to fetch team data for status checks.", variant: "destructive" });
    });

    Promise.all([
        getDocs(query(usersQuery, limit(1))),
        getDocs(query(teamsQuery, limit(1)))
    ]).finally(() => setLoading(false));

    return () => {
        unsubscribeUsers();
        unsubscribeTeams();
    };
  }, [toast]);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
        const result = await exportUsers({ role: roleFilter, status: statusFilter });
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'users-export.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "User data has been exported." });
        } else {
            toast({ title: "Export Failed", description: result.message || "Could not generate the export file.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error exporting users:", error);
        toast({ title: "Error", description: "An unexpected error occurred during export.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: UserProfile) => {
    setIsProcessing(`delete-user-${userToDelete.uid}`);
    try {
        const result = await deleteUser({ uid: userToDelete.uid });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while deleting the user.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };
  
  const handleMakeAdmin = async (userToPromote: UserProfile) => {
    setIsProcessing(`promote-${userToPromote.uid}`);
    try {
        const result = await makeAdmin({ email: userToPromote.email });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while promoting the user.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    setIsProcessing(`delete-team-${teamId}`);
     try {
        const result = await manageTeamBySpoc({ teamId, action: 'delete-team' });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch (error) {
         toast({ title: "Error", description: "An unexpected error occurred while deleting the team.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };
  
  const filteredAndSortedUsers = useMemo(() => {
    let filteredUsers = [...users];
    
    if (roleFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => {
            const team = user.teamId ? teams.get(user.teamId) : undefined;
            if (!team) return statusFilter === 'pending';

            const memberCount = (team.members?.length || 0) + 1;
            let femaleCount = 0;
            const leaderProfile = allTeamMembers.get(team.leader.uid);
            if (leaderProfile?.gender === 'F') femaleCount++;
            team.members.forEach(m => {
                const memberProfile = allTeamMembers.get(m.uid);
                if (memberProfile?.gender === 'F') femaleCount++;
            });
            
            const isRegistered = memberCount === 6 && femaleCount >= 1;
            return statusFilter === 'registered' ? isRegistered : !isRegistered;
        });
    }

    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.institute && user.institute.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    if (sortConfig !== null) {
      filteredUsers.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return filteredUsers;
  }, [users, searchTerm, sortConfig, roleFilter, statusFilter, teams, allTeamMembers]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
        <p className="text-muted-foreground">View and manage all user accounts on the portal.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {filteredAndSortedUsers.length} user(s) found.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Input 
                    placeholder="Search by name, email, institute..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:max-w-xs"
                />
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="leader">Leaders</SelectItem>
                        <SelectItem value="member">Members</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="registered">Registered Teams</SelectItem>
                        <SelectItem value="pending">Pending Teams</SelectItem>
                    </SelectContent>
                </Select>
                 <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                    Export
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Name {getSortIndicator('name')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIndicator('email')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('role')}>Role {getSortIndicator('role')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('institute')}>Institute {getSortIndicator('institute')}</Button></TableHead>
                  <TableHead>Team ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">
                      {user.enrollmentNumber && user.enrollmentNumber !== 'N/A' ? (
                        <Link href={`/profile/${user.enrollmentNumber}`} className="hover:underline">
                            {user.name}
                        </Link>
                      ) : (
                        user.name
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'spoc' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell>{user.institute || 'N/A'}</TableCell>
                    <TableCell className="text-xs">{user.teamId || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMakeAdmin(user)}
                            disabled={isProcessing?.includes(user.uid) || user.role === 'admin'}
                        >
                            {isProcessing === `promote-${user.uid}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}
                            Make Admin
                        </Button>
                        {user.teamId && (
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={isProcessing?.includes(user.uid)}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Delete Team
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {user.name}&apos;s Team?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the team associated with this user ({user.teamId}). Members will be unassigned but their accounts will NOT be deleted. Are you sure?
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTeam(user.teamId!, 'this team')} className="bg-destructive hover:bg-destructive/90">Delete Team</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                       <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isProcessing?.includes(user.uid) || user.role === 'admin'}>
                                    {isProcessing === `delete-user-${user.uid}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user account for {user.email} from both authentication and the database.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user)} className="bg-destructive hover:bg-destructive/90">Delete User</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredAndSortedUsers.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-10">No users match your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
