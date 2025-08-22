
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Save, Pencil, X, Trash2, MinusCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Team, UserProfile, ProblemStatementCategory, TeamMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSTITUTES } from "@/lib/constants";
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

type CategoryFilter = ProblemStatementCategory | "All Categories";

export default function AllTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const [editingTeam, setEditingTeam] = useState<{ id: string, name: string } | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [instituteFilter, setInstituteFilter] = useState<string>("All Institutes");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All Categories");
  const { toast } = useToast();
  
  const categories: CategoryFilter[] = ["All Categories", "Software", "Hardware", "Hardware & Software"];

  useEffect(() => {
    setLoading(true);
    const teamsCollection = collection(db, 'teams');
    const usersCollection = collection(db, 'users');

    const unsubscribeTeams = onSnapshot(teamsCollection, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
    }, (error) => {
      console.error("Error fetching teams:", error);
      toast({ title: "Error", description: "Failed to fetch teams.", variant: "destructive" });
    });

    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({uid: doc.id, ...doc.data()} as UserProfile));
      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to fetch user data.", variant: "destructive" });
    });

    // Wait for both snapshots to load initially
    Promise.all([
        new Promise(res => { const unsub = onSnapshot(teamsCollection, () => { res(true); unsub(); }); }),
        new Promise(res => { const unsub = onSnapshot(usersCollection, () => { res(true); unsub(); }); })
    ]).then(() => setLoading(false));

    return () => {
      unsubscribeTeams();
      unsubscribeUsers();
    };
  }, [toast]);

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
        const instituteMatch = instituteFilter === 'All Institutes' || team.institute === instituteFilter;
        const categoryMatch = categoryFilter === 'All Categories' || team.category === categoryFilter;
        return instituteMatch && categoryMatch;
    });
  }, [teams, instituteFilter, categoryFilter]);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
        const result = await exportTeams({
            institute: instituteFilter,
            category: categoryFilter,
        });
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'teams-export.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "Team data has been exported." });
        } else {
            toast({ title: "Export Failed", description: result.message || "Could not generate the export file.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error exporting data:", error);
        toast({ title: "Error", description: "An unexpected error occurred during export.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
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

  const getTeamWithFullDetails = (teamsToProcess: Team[]) => {
    return teamsToProcess.map(team => {
        const leaderProfile = users.find(u => u.uid === team.leader.uid);
        const membersWithDetails = team.members.map(member => {
            const memberProfile = users.find(u => u.email === member.email);
            return {
                ...member,
                uid: memberProfile?.uid,
                enrollmentNumber: memberProfile?.enrollmentNumber || member.enrollmentNumber || 'N/A',
                contactNumber: memberProfile?.contactNumber || member.contactNumber || 'N/A',
                yearOfStudy: memberProfile?.yearOfStudy || 'N/A',
                semester: memberProfile?.semester,
            };
        });
        const allMembers: (TeamMember & {isLeader: boolean})[] = [
            {
                uid: leaderProfile?.uid!,
                name: leaderProfile?.name || team.leader.name,
                email: leaderProfile?.email || team.leader.email,
                enrollmentNumber: leaderProfile?.enrollmentNumber || 'N/A',
                contactNumber: leaderProfile?.contactNumber || 'N/A',
                yearOfStudy: leaderProfile?.yearOfStudy || 'N/A',
                semester: leaderProfile?.semester,
                gender: leaderProfile?.gender || 'Other',
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
  
  const teamsWithDetails = getTeamWithFullDetails(filteredTeams);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">All Teams</h1>
            <p className="text-muted-foreground">View and manage all registered teams.</p>
        </div>
        <div className="flex gap-2">
            <Select value={instituteFilter} onValueChange={setInstituteFilter}>
                <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Institute" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All Institutes">All Institutes</SelectItem>
                    {INSTITUTES.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export
            </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Registered Teams List</CardTitle>
          <CardDescription>
            {teamsWithDetails.length} team(s) found with the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : teamsWithDetails.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Member Name</TableHead>
                        <TableHead>Enrollment No.</TableHead>
                        <TableHead>Contact No.</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Sem</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {teamsWithDetails.map((team) => (
                       team.allMembers.map((member, memberIndex) => (
                         <TableRow key={`${team.id}-${memberIndex}`}>
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
                                                <AlertDialogAction onClick={() => handleDeleteTeam(team.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            )}
                            <TableCell>{member.name} {member.isLeader && '(Leader)'}</TableCell>
                            <TableCell>{member.enrollmentNumber}</TableCell>
                            <TableCell>{member.contactNumber}</TableCell>
                            <TableCell>{member.yearOfStudy}</TableCell>
                            <TableCell>{member.semester}</TableCell>
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
          ) : (
            <p className="text-center text-muted-foreground py-4">No teams match the current filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    