
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Save, Pencil, X, Trash2, MinusCircle, ChevronDown, ArrowUpDown, FileText } from "lucide-react";
import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query } from "firebase/firestore";
import { Team, UserProfile, ProblemStatementCategory, TeamMember, ProblemStatement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { generateNominationForm } from "@/ai/flows/generate-nomination-form-flow";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { manageTeamBySpoc } from "@/ai/flows/manage-team-by-spoc-flow";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

type CategoryFilter = ProblemStatementCategory | "All Categories";
type SortKey = 'teamName' | 'problemStatementId' | 'name' | 'email' | 'enrollmentNumber' | 'contactNumber' | 'yearOfStudy' | 'semester';
type SortDirection = 'asc' | 'desc';

function AllTeamsContent() {
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<Map<string, UserProfile>>(new Map());
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isNominating, setIsNominating] = useState<string | null>(null);
  
  const [editingTeam, setEditingTeam] = useState<{ id: string, name: string } | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [instituteFilter, setInstituteFilter] = useState<string>("All Institutes");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All Categories");
  const [selectedProblemStatements, setSelectedProblemStatements] = useState<string[]>([]);
  const [filteredProblemStatements, setFilteredProblemStatements] = useState<ProblemStatement[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);


  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const categories: CategoryFilter[] = ["All Categories", "Software", "Hardware", "Hardware & Software"];

  useEffect(() => {
    const psIdFromQuery = searchParams.get('problemStatementId');
    if (psIdFromQuery) {
        setSelectedProblemStatements([psIdFromQuery]);
    }
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    // Listen to all teams
    const teamsQuery = query(collection(db, 'teams'));
    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setAllTeams(teamsData);

        // From all teams, get all unique user UIDs
        const allUserIds = new Set<string>();
        teamsData.forEach(team => {
            allUserIds.add(team.leader.uid);
            team.members.forEach(member => {
                if (member.uid) allUserIds.add(member.uid);
            });
        });
        
        const userUnsubscribers: (()=>void)[] = [];
        if (allUserIds.size > 0) {
            // Listen to each user document for real-time profile updates
             Array.from(allUserIds).forEach(uid => {
                const userDocRef = doc(db, 'users', uid);
                const unsub = onSnapshot(userDocRef, (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
                        setAllUsers(prevUsers => new Map(prevUsers).set(uid, userData));
                    }
                });
                userUnsubscribers.push(unsub);
            });
        }

        if (loading) setLoading(false);

        return () => userUnsubscribers.forEach(unsub => unsub());

    }, (error) => {
        console.error("Error fetching teams:", error);
        toast({ title: "Error", description: "Failed to fetch teams.", variant: "destructive" });
        setLoading(false);
    });

    const problemStatementsCollection = collection(db, 'problemStatements');
    const unsubscribeProblemStatements = onSnapshot(problemStatementsCollection, (snapshot) => {
      const psData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as ProblemStatement));
      setProblemStatements(psData);
      setFilteredProblemStatements(psData); // Initially show all
    }, (error) => {
      console.error("Error fetching problem statements:", error);
      toast({ title: "Error", description: "Failed to fetch problem statements.", variant: "destructive" });
    });

    return () => {
      unsubscribeTeams();
      unsubscribeProblemStatements();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (categoryFilter === "All Categories") {
        setFilteredProblemStatements(problemStatements);
    } else {
        const filtered = problemStatements.filter(ps => ps.category === categoryFilter);
        setFilteredProblemStatements(filtered);
    }
    // Reset selected problem statements when category changes
    setSelectedProblemStatements([]);
  }, [categoryFilter, problemStatements]);


  const filteredTeams = useMemo(() => {
    return allTeams.filter(team => {
        const instituteMatch = instituteFilter === 'All Institutes' || team.institute === instituteFilter;
        const categoryMatch = categoryFilter === 'All Categories' || team.category === categoryFilter;
        const psMatch = selectedProblemStatements.length === 0 || (team.problemStatementId && selectedProblemStatements.includes(team.problemStatementId));
        return instituteMatch && categoryMatch && psMatch;
    });
  }, [allTeams, instituteFilter, categoryFilter, selectedProblemStatements]);
  
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

  const handleGenerateNomination = async (teamId: string) => {
    setIsNominating(teamId);
    try {
        const result = await generateNominationForm({ teamId });
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'nomination-form.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "Nomination form generated." });
        } else {
            toast({ title: "Generation Failed", description: result.message || "Could not generate the nomination form.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error generating nomination form:", error);
        toast({ title: "Error", description: "An unexpected error occurred during nomination form generation.", variant: "destructive" });
    } finally {
        setIsNominating(null);
    }
  };
  
  const handleEditTeamName = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId);
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
        const leaderProfile = allUsers.get(team.leader.uid);
        const membersWithDetails = team.members.map(member => {
            let memberProfile: UserProfile | undefined;
            if (member.uid) {
                memberProfile = allUsers.get(member.uid);
            } else {
                for (const user of allUsers.values()) {
                    if (user.email === member.email) {
                        memberProfile = user;
                        break;
                    }
                }
            }
            
            return {
                ...member,
                uid: memberProfile?.uid || member.uid,
                name: memberProfile?.name || member.name,
                email: memberProfile?.email || member.email,
                enrollmentNumber: memberProfile?.enrollmentNumber || 'N/A',
                contactNumber: memberProfile?.contactNumber || 'N/A',
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
                gender: leaderProfile?.gender || 'O',
                isLeader: true,
            },
            ...membersWithDetails.map(m => ({...m, isLeader: false})),
        ];
        const problemStatement = problemStatements.find(ps => ps.id === team.problemStatementId);
        return {
            ...team,
            allMembers,
            problemStatementId: problemStatement?.problemStatementId,
        };
    });
  };
  
  const teamsWithDetails = useMemo(() => {
    const flattenedData: any[] = [];
    const detailedTeams = getTeamWithFullDetails(filteredTeams);
    
    detailedTeams.forEach(team => {
        team.allMembers.forEach((member, memberIndex) => {
            flattenedData.push({
                ...member,
                teamName: team.name,
                teamId: team.id,
                problemStatementId: team.problemStatementId || 'Not Selected',
                isFirstRow: memberIndex === 0,
                rowSpan: team.allMembers.length,
            });
        });
    });

    if (sortConfig !== null) {
        flattenedData.sort((a, b) => {
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

    return flattenedData;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTeams, allUsers, problemStatements, sortConfig]);

  const handleProblemStatementFilterChange = (psId: string) => {
    setSelectedProblemStatements(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(psId)) {
            newSelection.delete(psId);
        } else {
            newSelection.add(psId);
        }
        return Array.from(newSelection);
    });
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">All Teams</h1>
            <p className="text-muted-foreground">View and manage all registered teams.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Select value={instituteFilter} onValueChange={setInstituteFilter}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Institute" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All Institutes">All Institutes</SelectItem>
                    {INSTITUTES.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
            </Select>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-48 justify-between">
                         {selectedProblemStatements.length > 0 ? `${selectedProblemStatements.length} selected` : 'Filter by PS'}
                         <ChevronDown className="h-4 w-4 ml-2"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Problem Statements</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {filteredProblemStatements.length > 0 ? filteredProblemStatements.map((ps) => (
                        <DropdownMenuCheckboxItem
                            key={ps.id}
                            checked={selectedProblemStatements.includes(ps.id)}
                            onCheckedChange={() => handleProblemStatementFilterChange(ps.id)}
                        >
                            {ps.problemStatementId}
                        </DropdownMenuCheckboxItem>
                    )) : <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">No statements for this category</DropdownMenuLabel>}
                </DropdownMenuContent>
            </DropdownMenu>
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
            {filteredTeams.length} team(s) found with the current filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : teamsWithDetails.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('teamName')}>Team Name {getSortIndicator('teamName')}</Button>
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('problemStatementId')}>Problem Statement {getSortIndicator('problemStatementId')}</Button>
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('name')}>Member Name {getSortIndicator('name')}</Button>
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIndicator('email')}</Button>
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('enrollmentNumber')}>Enrollment No. {getSortIndicator('enrollmentNumber')}</Button>
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('contactNumber')}>Contact No. {getSortIndicator('contactNumber')}</Button>
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('yearOfStudy')}>Year {getSortIndicator('yearOfStudy')}</Button>
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('semester')}>Sem {getSortIndicator('semester')}</Button>
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {teamsWithDetails.map((row, index) => (
                          <TableRow key={`${row.teamId}-${row.uid || index}`}>
                              {row.isFirstRow && (
                                  <TableCell rowSpan={row.rowSpan} className="font-medium align-top">
                                      <div className="flex items-center gap-2 group">
                                          <span>{row.teamName}</span>
                                          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleEditTeamName(row.teamId)}>
                                              <Pencil className="h-4 w-4 text-muted-foreground"/>
                                          </Button>
                                      </div>
                                  </TableCell>
                              )}
                              {row.isFirstRow && <TableCell rowSpan={row.rowSpan} className="align-top">{row.problemStatementId}</TableCell>}
                              <TableCell>
                                  {row.enrollmentNumber && row.enrollmentNumber !== 'N/A' ? (
                                      <Link href={`/profile/${row.enrollmentNumber}`} className="hover:underline">
                                          {row.name} {row.isLeader && '(Leader)'}
                                      </Link>
                                  ) : (
                                      `${row.name} ${row.isLeader ? '(Leader)' : ''}`
                                  )}
                              </TableCell>
                              <TableCell>{row.email}</TableCell>
                              <TableCell>{row.enrollmentNumber}</TableCell>
                              <TableCell>
                                  {row.contactNumber && row.contactNumber !== 'N/A' ? (
                                      <a href={`https://wa.me/+91${row.contactNumber}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                          {row.contactNumber}
                                      </a>
                                  ) : 'N/A'}
                              </TableCell>
                              <TableCell>{row.yearOfStudy}</TableCell>
                              <TableCell>{row.semester}</TableCell>
                              <TableCell className="text-right">
                                  {row.isFirstRow ? (
                                    <div className="flex gap-1 justify-end">
                                      <Button variant="outline" size="sm" onClick={() => handleGenerateNomination(row.teamId)} disabled={isNominating === row.teamId}>
                                          {isNominating === row.teamId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4"/>}
                                          Nomination
                                      </Button>
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isProcessing === row.teamId}>
                                                  {isProcessing === row.teamId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                              </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  This will permanently delete the team "{row.teamName}" and all its members' accounts. This action cannot be undone.
                                              </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteTeam(row.teamId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                              </AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  ) : (
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isProcessing === `${row.teamId}-${row.uid}`}>
                                                  {isProcessing === `${row.teamId}-${row.uid}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <MinusCircle className="h-4 w-4 text-destructive"/>}
                                              </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader>
                                              <AlertDialogTitle>Remove {row.name}?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  Are you sure you want to remove {row.name} from this team? Their account will not be deleted, but they will be removed from the team.
                                              </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleRemoveMember(row.teamId, row)} className="bg-destructive hover:bg-destructive/90">Remove Member</AlertDialogAction>
                                              </AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  )}
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-4">No teams match the current filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AllTeamsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AllTeamsContent />
        </Suspense>
    )
}
