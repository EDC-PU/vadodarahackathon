
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Save } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Team, UserProfile, ProblemStatementCategory } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSTITUTES } from "@/lib/constants";

type CategoryFilter = ProblemStatementCategory | "All Categories";

export default function AllTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [teamNumberInputs, setTeamNumberInputs] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
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
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
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

  const getTeamWithFullDetails = (teamsToProcess: Team[]) => {
    return teamsToProcess.map(team => {
        const leaderProfile = users.find(u => u.uid === team.leader.uid);
        const membersWithDetails = team.members.map(member => {
            const memberProfile = users.find(u => u.email === member.email);
            return {
                ...member,
                enrollmentNumber: memberProfile?.enrollmentNumber || member.enrollmentNumber || 'N/A',
                contactNumber: memberProfile?.contactNumber || member.contactNumber || 'N/A',
            };
        });
        const allMembers = [
            {
                name: leaderProfile?.name || team.leader.name,
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

  const handleTeamNumberChange = (teamId: string, value: string) => {
    setTeamNumberInputs(prev => ({...prev, [teamId]: value}));
  };
  
  const handleSaveTeamNumber = async (teamId: string) => {
    const teamNumber = teamNumberInputs[teamId];
    if (!teamNumber) {
        toast({ title: "Error", description: "Team number cannot be empty.", variant: "destructive" });
        return;
    }
    setIsSaving(teamId);
    try {
        const teamDocRef = doc(db, 'teams', teamId);
        await updateDoc(teamDocRef, { teamNumber: teamNumber });
        toast({ title: "Success", description: "Team number has been allocated." });
    } catch (error) {
        console.error("Error allocating team number:", error);
        toast({ title: "Error", description: "Could not allocate team number.", variant: "destructive" });
    } finally {
        setIsSaving(null);
    }
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
                        <TableHead className="w-[200px]">Team No.</TableHead>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Member Name</TableHead>
                        <TableHead>Enrollment No.</TableHead>
                        <TableHead>Contact No.</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {teamsWithDetails.map((team) => (
                       team.allMembers.map((member, memberIndex) => (
                         <TableRow key={`${team.id}-${memberIndex}`}>
                            {memberIndex === 0 && (
                                <>
                                    <TableCell rowSpan={team.allMembers.length} className="font-medium align-top">
                                        {team.teamNumber ? (
                                            <span className="font-bold text-lg">{team.teamNumber}</span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    placeholder="e.g., T001" 
                                                    value={teamNumberInputs[team.id] || ''}
                                                    onChange={(e) => handleTeamNumberChange(team.id, e.target.value)}
                                                    disabled={isSaving === team.id}
                                                    className="w-24"
                                                />
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleSaveTeamNumber(team.id)}
                                                    disabled={isSaving === team.id}
                                                >
                                                    {isSaving === team.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4"/>}
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell rowSpan={team.allMembers.length} className="font-medium align-top">{team.name}</TableCell>
                                </>
                            )}
                            <TableCell>{member.name} {member.isLeader && '(Leader)'}</TableCell>
                            <TableCell>{member.enrollmentNumber}</TableCell>
                            <TableCell>{member.contactNumber}</TableCell>
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
