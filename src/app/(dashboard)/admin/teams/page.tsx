

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Save, Pencil, X, Trash2, MinusCircle, ChevronDown, ArrowUpDown, RefreshCw, Lock, Unlock, FileText, FileBadge, Award } from "lucide-react";
import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy, getDocs, where } from "firebase/firestore";
import { Team, UserProfile, ProblemStatementCategory, TeamMember, ProblemStatement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toggleTeamLock } from "@/ai/flows/toggle-team-lock-flow";
import { exportCertificateData } from "@/ai/flows/export-certificate-data-flow";

type CategoryFilter = ProblemStatementCategory | "All Categories";
type StatusFilter = "All Statuses" | "Registered" | "Pending";
type RoleFilter = "all" | "leader" | "member";
type SortKey = 'teamName' | 'problemStatementId' | 'name' | 'email' | 'enrollmentNumber' | 'contactNumber' | 'yearOfStudy' | 'semester' | 'teamNumber';
type SortDirection = 'asc' | 'desc';

// Helper to fetch user profiles in chunks to avoid Firestore 30-item 'in' query limit
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


function AllTeamsContent() {
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<Map<string, UserProfile>>(new Map());
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCerts, setIsExportingCerts] = useState(false);
  
  const [editingTeamName, setEditingTeamName] = useState<{ id: string; name: string } | null>(null);
  const [editingTeamNumber, setEditingTeamNumber] = useState<{ id: string; number: string } | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [instituteFilter, setInstituteFilter] = useState<string>("All Institutes");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All Categories");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Registered");
  const [memberCountFilter, setMemberCountFilter] = useState<number | "All">("All");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProblemStatements, setSelectedProblemStatements] = useState<string[]>([]);
  const [filteredProblemStatements, setFilteredProblemStatements] = useState<ProblemStatement[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);

  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const categories: CategoryFilter[] = ["All Categories", "Software", "Hardware"];
  const statuses: StatusFilter[] = ["All Statuses", "Registered", "Pending"];

  useEffect(() => {
    const psIdFromQuery = searchParams.get('problemStatementId');
    if (psIdFromQuery) {
        setSelectedProblemStatements([psIdFromQuery]);
    }
  }, [searchParams]);

 const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const teamsQuery = query(collection(db, 'teams'));
        const unsubscribeTeams = onSnapshot(teamsQuery, async (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
            setAllTeams(teamsData);

            const allUserIds = new Set<string>();
            teamsData.forEach(team => {
                allUserIds.add(team.leader.uid);
                team.members.forEach(member => {
                    if (member.uid) allUserIds.add(member.uid);
                });
            });

            const usersData = await getUserProfilesInChunks(Array.from(allUserIds));
            setAllUsers(usersData);
            setLoading(false); // Set loading to false after users are fetched
        });

        const problemStatementsQuery = query(collection(db, 'problemStatements'));
        const unsubscribePS = onSnapshot(problemStatementsQuery, (snapshot) => {
            const psData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
            setProblemStatements(psData);
            setFilteredProblemStatements(psData);
        });

        const institutesQuery = query(collection(db, 'institutes'), orderBy("name"));
        const unsubscribeInstitutes = onSnapshot(institutesQuery, (snapshot) => {
            const institutesData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            setInstitutes(institutesData);
        });

        return () => {
            unsubscribeTeams();
            unsubscribePS();
            unsubscribeInstitutes();
        };
    } catch (error) {
        console.error("Error setting up listeners:", error);
        toast({ title: "Error", description: "Could not initialize data listeners.", variant: "destructive" });
        setLoading(false);
    }
}, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);


  useEffect(() => {
    if (categoryFilter === "All Categories") {
        setFilteredProblemStatements(problemStatements);
    } else {
        const filtered = problemStatements.filter(ps => ps.category === categoryFilter);
        setFilteredProblemStatements(filtered);
    }
    setSelectedProblemStatements([]);
  }, [categoryFilter, problemStatements]);


  const filteredTeams = useMemo(() => {
    return allTeams.filter(team => {
        const instituteMatch = instituteFilter === 'All Institutes' || team.institute === instituteFilter;
        const categoryMatch = categoryFilter === 'All Categories' || team.category === categoryFilter;
        
        const showNotSelected = selectedProblemStatements.includes('not-selected');
        const selectedPsIds = selectedProblemStatements.filter(id => id !== 'not-selected');
        
        const psMatch = selectedProblemStatements.length === 0 || 
                        (showNotSelected && !team.problemStatementId) || 
                        (selectedPsIds.length > 0 && team.problemStatementId && selectedPsIds.includes(team.problemStatementId));
        
        const leaderProfile = allUsers.get(team.leader.uid);
        const allMemberProfiles = [leaderProfile, ...team.members.map(m => allUsers.get(m.uid))].filter(Boolean) as UserProfile[];
        const memberCount = allMemberProfiles.length;
        const memberCountMatch = memberCountFilter === "All" || memberCount === memberCount;

        let searchMatch = true;
        if (searchTerm) {
            const lowercasedSearch = searchTerm.toLowerCase();
            const leader = allUsers.get(team.leader.uid);
            const members = team.members.map(m => allUsers.get(m.uid));
            const teamText = [
                team.name,
                team.teamNumber,
                team.institute,
                leader?.name,
                leader?.email,
                ...members.flatMap(m => [m?.name, m?.email])
            ].join(' ').toLowerCase();

            searchMatch = teamText.includes(lowercasedSearch);
        }

        const femaleCount = allMemberProfiles.filter(m => m.gender === 'F').length;
        const instituteCount = allMemberProfiles.filter(m => m.institute === team.institute).length;
        const isRegistered = memberCount === 6 && femaleCount >= 1 && instituteCount >= 3 && !!team.problemStatementId;
        
        const statusMatch = statusFilter === 'All Statuses' ? true : (statusFilter === 'Registered' ? isRegistered : !isRegistered);
        
        return instituteMatch && categoryMatch && psMatch && statusMatch && searchMatch && memberCountMatch;
    });
  }, [allTeams, instituteFilter, categoryFilter, selectedProblemStatements, statusFilter, allUsers, searchTerm, memberCountFilter]);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
        const result = await exportTeams({
            institute: instituteFilter,
            category: categoryFilter,
            status: statusFilter,
            problemStatementIds: selectedProblemStatements,
            memberCount: memberCountFilter,
            role: roleFilter,
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
  
  const handleExportForCertificates = async () => {
    setIsExportingCerts(true);
    try {
        const result = await exportCertificateData();
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'certificate-data.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "Certificate data for registered teams has been exported." });
        } else {
            toast({ title: "Export Failed", description: result.message || "Could not generate the export file.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error exporting certificate data:", error);
        toast({ title: "Error", description: "An unexpected error occurred during export.", variant: "destructive" });
    } finally {
        setIsExportingCerts(false);
    }
  };

  const handleEditTeamName = (team: Team) => {
    setEditingTeamName({ id: team.id, name: team.name });
  };
  
  const handleEditTeamNumber = (team: Team) => {
    setEditingTeamNumber({ id: team.id, number: team.teamNumber || '' });
  };

  const handleSaveTeamName = async (teamId: string) => {
      if (!editingTeamName || editingTeamName.id !== teamId) return;

      setIsSaving(`name-${teamId}`);
      try {
          const teamDocRef = doc(db, "teams", teamId);
          await updateDoc(teamDocRef, { name: editingTeamName.name });
          toast({ title: "Success", description: "Team name updated." });
          setEditingTeamName(null);
      } catch (error) {
          console.error("Error updating team name:", error);
          toast({ title: "Error", description: "Could not update team name.", variant: "destructive" });
      } finally {
          setIsSaving(null);
      }
  };

  const handleSaveTeamNumber = async (teamId: string) => {
      if (!editingTeamNumber || editingTeamNumber.id !== teamId) return;

      setIsSaving(`number-${teamId}`);
      try {
          const teamDocRef = doc(db, "teams", teamId);
          await updateDoc(teamDocRef, { teamNumber: editingTeamNumber.number });
          toast({ title: "Success", description: "Team number updated." });
          setEditingTeamNumber(null);
      } catch (error) {
          console.error("Error updating team number:", error);
          toast({ title: "Error", description: "Could not update team number.", variant: "destructive" });
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

        const allMemberProfiles = allMembers.map(m => allUsers.get(m.uid)).filter(Boolean) as UserProfile[];
        const femaleCount = allMemberProfiles.filter(m => m.gender === 'F').length;
        const instituteCount = allMemberProfiles.filter(m => m.institute === team.institute).length;
        const isRegistered = allMemberProfiles.length === 6 && femaleCount >= 1 && instituteCount >= 3 && !!team.problemStatementId;
        
        const problemStatement = problemStatements.find(ps => ps.id === team.problemStatementId);
        return {
            ...team,
            allMembers,
            problemStatement: problemStatement,
            isRegistered,
        };
    });
  };
  
  const teamsWithDetails = useMemo(() => {
    const flattenedData: any[] = [];
    const detailedTeams = getTeamWithFullDetails(filteredTeams);
    
    detailedTeams.forEach(team => {
        let membersToDisplay = team.allMembers;
        if (roleFilter === 'leader') {
            membersToDisplay = team.allMembers.filter(m => m.isLeader);
        } else if (roleFilter === 'member') {
            membersToDisplay = team.allMembers.filter(m => !m.isLeader);
        }

        if (membersToDisplay.length > 0) {
            membersToDisplay.forEach((member, memberIndex) => {
                flattenedData.push({
                    ...member,
                    teamName: team.name,
                    teamId: team.id,
                    isLocked: team.isLocked,
                    teamNumber: team.teamNumber,
                    isNominated: team.isNominated,
                    sihSelectionStatus: team.sihSelectionStatus,
                    problemStatement: team.problemStatement,
                    isRegistered: team.isRegistered,
                    isFirstRow: memberIndex === 0,
                    rowSpan: membersToDisplay.length,
                    institute: team.institute,
                    universityTeamId: team.universityTeamId
                });
            });
        }
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
  }, [filteredTeams, allUsers, problemStatements, sortConfig, roleFilter]);

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

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedTeamIds(filteredTeams.map(t => t.id));
    } else {
        setSelectedTeamIds([]);
    }
  };

  const handleRowSelect = (teamId: string, checked: boolean) => {
    if (checked) {
        setSelectedTeamIds(prev => [...prev, teamId]);
    } else {
        setSelectedTeamIds(prev => prev.filter(id => id !== teamId));
    }
  };

  const handleLockToggle = async (teamId: string, isLocked: boolean) => {
      setIsSaving(`lock-${teamId}`);
      try {
          const result = await toggleTeamLock({ teamId, isLocked });
          if(result.success) {
              toast({ title: "Success", description: result.message });
          } else {
              throw new Error(result.message);
          }
      } catch(error: any) {
           toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
          setIsSaving(null);
      }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">All Teams</h1>
            <p className="text-muted-foreground">View and manage all registered teams.</p>
        </div>
        <div className="flex flex-wrap gap-2">
             <Button onClick={() => fetchData()} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-48"
            />
            <Select value={instituteFilter} onValueChange={setInstituteFilter}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Institute" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All Institutes">All Institutes</SelectItem>
                    {institutes.map(inst => <SelectItem key={inst.id} value={inst.name}>{inst.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
            </Select>
             <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    {statuses.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={String(memberCountFilter)} onValueChange={(val) => setMemberCountFilter(val === "All" ? "All" : Number(val))}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Members" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Member Counts</SelectItem>
                    {[1, 2, 3, 4, 5, 6].map(num => <SelectItem key={num} value={String(num)}>{num} Member(s)</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
                <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="leader">Leaders Only</SelectItem>
                    <SelectItem value="member">Members Only</SelectItem>
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
                    <DropdownMenuCheckboxItem
                        key="not-selected"
                        checked={selectedProblemStatements.includes('not-selected')}
                        onCheckedChange={() => handleProblemStatementFilterChange('not-selected')}
                    >
                        Not Selected
                    </DropdownMenuCheckboxItem>
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
            <Button variant="outline" onClick={handleExportForCertificates} disabled={isExportingCerts}>
                {isExportingCerts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                Export for Certificates
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
                             <Checkbox 
                                onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                                checked={selectedTeamIds.length === filteredTeams.length && filteredTeams.length > 0}
                                aria-label="Select all"
                             />
                          </TableHead>
                          <TableHead>
                              <Button variant="ghost" onClick={() => requestSort('teamName')}>Team Info {getSortIndicator('teamName')}</Button>
                          </TableHead>
                          <TableHead>Lock Status</TableHead>
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
                          <TableRow key={`${row.teamId}-${row.uid || index}-${roleFilter}`} data-state={selectedTeamIds.includes(row.teamId) && "selected"} className="select-none">
                              {row.isFirstRow && (
                                  <TableCell rowSpan={row.rowSpan} className="align-top pt-6">
                                      <Checkbox 
                                          checked={selectedTeamIds.includes(row.teamId)}
                                          onCheckedChange={(checked) => handleRowSelect(row.teamId, !!checked)}
                                          aria-label={`Select team ${row.teamName}`}
                                      />
                                  </TableCell>
                              )}
                              {row.isFirstRow && (
                                  <TableCell rowSpan={row.rowSpan} className="font-medium align-top pt-6">
                                      <div className="flex flex-col gap-2 items-start w-64">
                                        <div className="flex items-center gap-2 group">
                                            <span className="font-bold text-base">{row.teamName}</span>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleEditTeamName(row)}>
                                                <Pencil className="h-4 w-4 text-muted-foreground"/>
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {row.isRegistered ? <Badge className="bg-green-600 hover:bg-green-700">Registered</Badge> : <Badge variant="destructive">Pending</Badge>}
                                            {row.sihSelectionStatus === 'university' ? <Badge className="bg-blue-500 hover:bg-blue-600">Nominated for SIH (Univ. Level)</Badge> 
                                            : row.sihSelectionStatus === 'institute' ? <Badge className="bg-purple-500 hover:bg-purple-600">Nominated for SIH (Inst. Level)</Badge> : null}
                                            {row.universityTeamId && <Badge variant="secondary">{`Univ. ID: ${row.universityTeamId}`}</Badge>}
                                            {row.teamNumber && <Badge variant="secondary">{`Team No: ${row.teamNumber}`}</Badge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{row.institute}</div>
                                        {row.problemStatement && (
                                            <div className="whitespace-normal text-xs text-muted-foreground">
                                                <FileText className="inline h-3 w-3 mr-1"/>
                                                {row.problemStatement.problemStatementId}: {row.problemStatement.title}
                                            </div>
                                        )}
                                      </div>
                                  </TableCell>
                              )}
                              {row.isFirstRow && (
                                <TableCell rowSpan={row.rowSpan} className="align-top pt-6">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id={`lock-switch-${row.teamId}`}
                                            checked={!row.isLocked}
                                            onCheckedChange={(checked) => handleLockToggle(row.teamId, !checked)}
                                            disabled={isSaving === `lock-${row.teamId}`}
                                        />
                                        <Label htmlFor={`lock-switch-${row.teamId}`} className="flex items-center gap-1.5">
                                            {row.isLocked ? <Lock className="h-4 w-4 text-destructive"/> : <Unlock className="h-4 w-4 text-green-500" />}
                                            {row.isLocked ? 'Locked' : 'Unlocked'}
                                        </Label>
                                    </div>
                                </TableCell>
                              )}
                               <TableCell className="whitespace-normal">
                                  {row.enrollmentNumber && row.enrollmentNumber !== 'N/A' ? (
                                      <Link href={`/profile/${row.enrollmentNumber}`} className="hover:underline">
                                          {row.name} {row.isLeader && '(Leader)'}
                                      </Link>
                                  ) : (
                                      `${row.name} ${row.isLeader ? '(Leader)' : ''}`
                                  )}
                              </TableCell>
                              <TableCell className="whitespace-normal select-text">{row.email}</TableCell>
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
                                              <AlertDialogAction onClick={() => handleDeleteTeam(row.teamId)} className="bg-destructive hover:bg-destructive/90">Delete Team</AlertDialogAction>
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
    
