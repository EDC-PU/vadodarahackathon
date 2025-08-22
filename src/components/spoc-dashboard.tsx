
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Save, Pencil, X, Trash2, Users, User, MinusCircle, Badge, ArrowUpDown } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { Team, UserProfile, TeamMember } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { AnnouncementsSection } from "./announcements-section";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
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
import { manageTeamBySpoc } from "@/ai/flows/manage-team-by-spoc-flow";
import { useAuth } from "@/hooks/use-auth";

type SortKey = 'teamName' | 'teamNumber' | 'name' | 'email' | 'enrollmentNumber' | 'contactNumber';
type SortDirection = 'asc' | 'desc';

export default function SpocDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<{ id: string, name: string } | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || user.role !== 'spoc' || !user.institute) {
        if (!authLoading) {
            setLoading(false);
        }
        return;
    }

    setLoading(true);

    const teamsQuery = query(collection(db, "teams"), where("institute", "==", user.institute));
    const unsubscribeTeams = onSnapshot(teamsQuery, (querySnapshot) => {
        const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsData);
    }, (error) => {
        console.error("Error fetching teams for SPOC:", error);
        toast({ title: "Error", description: "Failed to fetch institute teams.", variant: "destructive" });
    });

    const usersQuery = query(collection(db, "users"));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setUsers(usersData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching users for SPOC:", error);
        toast({ title: "Error", description: "Failed to fetch user data.", variant: "destructive" });
        setLoading(false);
    });

    return () => {
        unsubscribeTeams();
        unsubscribeUsers();
    };
  }, [user, authLoading, toast]);
  
  const getTeamWithFullDetails = (teamsToProcess: Team[]) => {
    return teamsToProcess.map(team => {
        const leaderProfile = users.find(u => u.uid === team.leader.uid);
        const membersWithDetails = team.members.map(member => {
            const memberProfile = users.find(u => u.email === member.email);
            return {
                ...member,
                uid: memberProfile?.uid,
                enrollmentNumber: memberProfile?.enrollmentNumber || 'N/A',
                contactNumber: memberProfile?.contactNumber || 'N/A',
            };
        });
        const allMembers = [
            {
                uid: leaderProfile?.uid,
                name: leaderProfile?.name || team.leader.name,
                email: leaderProfile?.email || team.leader.email,
                enrollmentNumber: leaderProfile?.enrollmentNumber || 'N/A',
                contactNumber: leaderProfile?.contactNumber || 'N/A',
                isLeader: true,
            },
            ...membersWithDetails.map(m => ({...m, isLeader: false})),
        ];
        return {
            ...team,
            allMembers,
        };
    });
  };

  const teamsWithDetails = useMemo(() => {
    const detailedTeams = getTeamWithFullDetails(teams);
    if (sortConfig !== null) {
      return [...detailedTeams].sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return detailedTeams;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, users, sortConfig]);

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

  const handleEditTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
        setEditingTeam({ id: teamId, name: team.name });
    }
  };

  const handleSaveTeamName = async (teamId: string) => {
      if (!editingTeam || editingTeam.id !== teamId) return;

      setIsSaving(teamId);
      try {
          const teamDocRef = doc(db, "teams", teamId);
          await updateDoc(teamDocRef, { name: editingTeam.name });
          toast({ title: "Success", description: "Team name updated." });
          setEditingTeam(null);
      } catch (error) {
          console.error("Error updating team name:", error);
          toast({ title: "Error", description: "Could not update team name.", variant: "destructive" });
      } finally {
          setIsSaving(null);
      }
  };
  
  const handleRemoveMember = async (teamId: string, memberToRemove: TeamMember) => {
    setIsProcessing(`${teamId}-${memberToRemove.uid}`);
    try {
        const result = await manageTeamBySpoc({ teamId, action: 'remove-member', memberEmail: memberToRemove.email });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch (error) {
         toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    setIsProcessing(teamId);
    try {
        const result = await manageTeamBySpoc({ teamId, action: 'delete-team' });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch (error) {
         toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return (
         <div className="p-4 sm:p-6 lg:p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>You are not authorized to view this page.</AlertDescription>
            </Alert>
        </div>
    )
  }

  const totalParticipants = teams.reduce((acc, team) => acc + 1 + team.members.length, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">SPOC Dashboard</h1>
        <p className="text-muted-foreground">Manage teams from your institute: <strong>{user?.institute}</strong></p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{teams.length}</div>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{totalParticipants}</div>
                   <p className="text-xs text-muted-foreground">Across all your teams</p>
              </CardContent>
          </Card>
      </div>

      <div className="mb-8">
        <AnnouncementsSection audience="spocs_and_all" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institute Teams</CardTitle>
          <CardDescription>{teams.length} team(s) registered from your institute.</CardDescription>
        </CardHeader>
        <CardContent>
            {teams.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No teams have registered from your institute yet.</p>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('teamName')}>Team Name {getSortIndicator('teamName')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('teamNumber')}>Team No. {getSortIndicator('teamNumber')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Member Name {getSortIndicator('name')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIndicator('email')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('enrollmentNumber')}>Enrollment No. {getSortIndicator('enrollmentNumber')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('contactNumber')}>Contact No. {getSortIndicator('contactNumber')}</Button></TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {teamsWithDetails.map((team) => (
                       team.allMembers.map((member, memberIndex) => (
                         <TableRow key={`${team.id}-${member.uid || memberIndex}`}>
                            {memberIndex === 0 && (
                                <TableCell rowSpan={team.allMembers.length} className="font-medium align-top">
                                    <div className="flex flex-col gap-2">
                                        {editingTeam?.id === team.id ? (
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    value={editingTeam.name}
                                                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                                    className="w-40 h-8"
                                                    disabled={isSaving === team.id}
                                                />
                                                <Button size="icon" className="h-8 w-8" onClick={() => handleSaveTeamName(team.id)} disabled={isSaving === team.id}>
                                                    {isSaving === team.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTeam(null)} disabled={isSaving === team.id}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                <span>{team.name}</span>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleEditTeamName(team.id)}>
                                                    <Pencil className="h-4 w-4 text-muted-foreground"/>
                                                </Button>
                                            </div>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" className="w-fit" disabled={isProcessing === team.id}>
                                                    <Trash2 className="mr-2 h-4 w-4"/> Delete Team
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the team "{team.name}" and remove all its members. This action cannot be undone.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteTeam(team.id)} className="bg-destructive hover:bg-destructive/90">Delete Team</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            )}
                             {memberIndex === 0 && (
                                <TableCell rowSpan={team.allMembers.length} className="align-top">
                                    {team.teamNumber ? <Badge variant="outline">{team.teamNumber}</Badge> : <span className="text-muted-foreground text-xs">Not Assigned</span>}
                                </TableCell>
                            )}
                            <TableCell>{member.name} {member.isLeader && '(Leader)'}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>{member.enrollmentNumber}</TableCell>
                            <TableCell>{member.contactNumber}</TableCell>
                            <TableCell className="text-right">
                                {!member.isLeader && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isProcessing === `${team.id}-${member.uid}`}>
                                                {isProcessing === `${team.id}-${member.uid}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <MinusCircle className="h-4 w-4 text-destructive"/>}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to remove {member.name} from this team? Their account will not be deleted, but they will be removed from the team.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveMember(team.id, member)} className="bg-destructive hover:bg-destructive/90">Remove Member</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </TableCell>
                         </TableRow>
                       ))
                    ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
