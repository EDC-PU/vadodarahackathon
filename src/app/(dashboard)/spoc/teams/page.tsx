

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Save, Pencil, X, Trash2, Users, User, MinusCircle, ArrowUpDown, Link as LinkIcon, Copy, RefreshCw, ChevronDown, FileQuestion, Lock, Unlock, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, writeBatch, orderBy, getDoc } from "firebase/firestore";
import { Team, UserProfile, TeamMember, ProblemStatement, ProblemStatementCategory } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { manageTeamBySpoc } from "@/ai/flows/manage-team-by-spoc-flow";
import { useAuth } from "@/hooks/use-auth";
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { Buffer } from 'buffer';
import { getTeamInviteLink } from "@/ai/flows/get-team-invite-link-flow";
import Link from "next/link";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { exportEvaluation } from "@/ai/flows/export-evaluation-flow";
import { isAfter } from "date-fns";
import { toggleTeamLock } from "@/ai/flows/toggle-team-lock-flow";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { generateNominationForm } from "@/ai/flows/generate-nomination-form-flow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type SortKey = 'teamName' | 'teamNumber' | 'name' | 'email' | 'enrollmentNumber' | 'contactNumber';
type SortDirection = 'asc' | 'desc';
type StatusFilter = "All Statuses" | "Registered" | "Pending";
type RoleFilter = "all" | "leader" | "member";
type CategoryFilter = ProblemStatementCategory | "All Categories";
type SihStatusFilter = "all" | "university" | "institute" | "none";

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


export default function SpocTeamsPage() {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeamName, setEditingTeamName] = useState<{ id: string; name: string } | null>(null);
  const [editingTeamNumber, setEditingTeamNumber] = useState<{ id: string; number: string } | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingEval, setIsExportingEval] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Registered");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All Categories");
  const [sihStatusFilter, setSihStatusFilter] = useState<SihStatusFilter>("institute");
  const [memberCountFilter, setMemberCountFilter] = useState<number | "All">("All");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [selectedProblemStatements, setSelectedProblemStatements] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);
  const { toast } = useToast();
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const [evaluationExportDate, setEvaluationExportDate] = useState<Date | null>(null);
  const [spocPsSelection, setSpocPsSelection] = useState<Record<string, string>>({});
  const appBaseUrl = "https://vadodarahackathon.pierc.org";

  const psSelectionDeadline = new Date('2025-08-31T23:59:59'); // Aug 31, 2025
  const canSpocSelectPs = isAfter(new Date(), psSelectionDeadline);

  const statuses: StatusFilter[] = ["All Statuses", "Registered", "Pending"];
  const categories: CategoryFilter[] = ["All Categories", "Software", "Hardware"];

  const fetchAllData = useCallback((institute: string) => {
    setLoading(true);
    
    // Fetch Teams
    const teamsQuery = query(collection(db, "teams"), where("institute", "==", institute));
    const unsubscribeTeams = onSnapshot(teamsQuery, async (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        
        const allUserIds = new Set<string>();
        teamsData.forEach(team => {
            allUserIds.add(team.leader.uid);
            team.members.forEach(member => {
                if (member.uid) allUserIds.add(member.uid);
            });
        });
        
        const usersData = await getUserProfilesInChunks(Array.from(allUserIds));

        setTeams(teamsData);
        setUsers(usersData);
        setLoading(false);

    }, (error) => {
        console.error("Error listening to team updates:", error);
        toast({ title: "Error", description: "Could not load real-time team data.", variant: "destructive" });
        setLoading(false);
    });

    // Fetch Problem Statements
    const psQuery = query(collection(db, 'problemStatements'), orderBy("problemStatementId"));
    const unsubscribePs = onSnapshot(psQuery, (snapshot) => {
        const psData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
        setProblemStatements(psData);
    });

    const configDocRef = doc(db, "config", "event");
    const unsubscribeConfig = onSnapshot(configDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data()?.evaluationExportDate) {
            setEvaluationExportDate(docSnap.data().evaluationExportDate.toDate());
        }
    });


    return () => {
        unsubscribeTeams();
        unsubscribePs();
        unsubscribeConfig();
    };
  }, [toast]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
        if (!user?.institute) {
            throw new Error("Institute information not available");
        }
        
        const result = await exportTeams({ 
            institute: user.institute, 
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
            a.download = result.fileName || `${user.institute}-teams.xlsx`;
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

  const handleExportEvaluation = async () => {
    setIsExportingEval(true);
    try {
        if (!user?.institute) {
            throw new Error("Institute information not available for export.");
        }
        if (filteredTeams.length === 0) {
            toast({
                title: "No Teams to Export",
                description: "There are no teams that match the current filter criteria.",
                variant: "destructive"
            });
            setIsExportingEval(false);
            return;
        }

        const problemStatementsMap = new Map(problemStatements.map(ps => [ps.id, ps]));
        
        const teamsToExport = filteredTeams.map(team => {
            const leader = users.get(team.leader.uid);
            const ps = team.problemStatementId ? problemStatementsMap.get(team.problemStatementId) : null;
            return {
              universityTeamId: team.universityTeamId || 'N/A',
              team_name: team.name,
              leader_name: leader?.name || 'N/A',
              problemstatement_id: ps?.problemStatementId || 'N/A',
              problemstatement_title: team.problemStatementTitle || 'N/A',
              category: team.category || 'N/A',
            };
        });
        
        const result = await exportEvaluation({ instituteName: user.institute, teams: teamsToExport });

        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || `${user.institute}-evaluation.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "Evaluation sheet has been exported." });
        } else {
            toast({ title: "Export Failed", description: result.message || "Could not generate the export file.", variant: "destructive" });
        }
    } catch (error: any) {
        console.error("Error exporting evaluation data:", error);
        toast({ title: "Error", description: `An unexpected error occurred during evaluation export: ${error.message}`, variant: "destructive" });
    } finally {
        setIsExportingEval(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user && user.institute) {
      unsubscribe = fetchAllData(user.institute);
    } else if (!authLoading) {
      setLoading(false);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authLoading, fetchAllData]);

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const allMemberUIDs = [team.leader.uid, ...team.members.map(m => m.uid)];
      const members = allMemberUIDs.map(uid => users.get(uid)).filter(Boolean) as UserProfile[];
      const hasFemale = members.some(m => m.gender === 'F');
      const instituteCount = members.filter(m => m.institute === team.institute).length;
      const isRegistered = members.length === 6 && hasFemale && instituteCount >= 3 && !!team.problemStatementId;
      
      const statusMatch = statusFilter === 'All Statuses' ? true : (
        statusFilter === 'Registered' ? isRegistered : !isRegistered
      );
      
      const showNotSelected = selectedProblemStatements.includes('not-selected');
      const selectedPsIds = selectedProblemStatements.filter(id => id !== 'not-selected');

      const psMatch = selectedProblemStatements.length === 0 || 
                      (showNotSelected && !team.problemStatementId) || 
                      (selectedPsIds.length > 0 && team.problemStatementId && selectedPsIds.includes(team.problemStatementId));
      
      const memberCount = team.members.length + 1;
      const memberCountMatch = memberCountFilter === "All" || memberCount === memberCount;
      const categoryMatch = categoryFilter === 'All Categories' || team.category === categoryFilter;

      let sihStatusMatch = true;
      if (sihStatusFilter !== 'all') {
          if (sihStatusFilter === 'none') {
              sihStatusMatch = !team.sihSelectionStatus;
          } else {
              sihStatusMatch = team.sihSelectionStatus === sihStatusFilter;
          }
      }

      return statusMatch && psMatch && memberCountMatch && categoryMatch && sihStatusMatch;
    });
  }, [teams, statusFilter, users, selectedProblemStatements, memberCountFilter, categoryFilter, sihStatusFilter]);
  
  const getTeamWithFullDetails = (teamsToProcess: Team[]) => {
    return teamsToProcess.map(team => {
        const leaderProfile = users.get(team.leader.uid);
        const membersWithDetails = team.members.map(member => {
            const memberProfile = member.uid ? users.get(member.uid) : undefined;
            return {
                ...member,
                uid: memberProfile?.uid || '',
                enrollmentNumber: memberProfile?.enrollmentNumber || 'N/A',
                contactNumber: memberProfile?.contactNumber || 'N/A',
            };
        });
        const allMembers: (TeamMember & { isLeader: boolean })[] = [
            {
                uid: leaderProfile?.uid!,
                name: leaderProfile?.name || team.leader.name,
                email: leaderProfile?.email || team.leader.email,
                enrollmentNumber: leaderProfile?.enrollmentNumber || 'N/A',
                contactNumber: leaderProfile?.contactNumber || 'N/A',
                gender: leaderProfile?.gender || 'O',
                isLeader: true,
            },
            ...membersWithDetails.map(m => ({...m, isLeader: false})),
        ];

        const allMemberProfiles = allMembers.map(m => users.get(m.uid)).filter(Boolean) as UserProfile[];
        const femaleCount = allMemberProfiles.filter(m => m.gender === 'F').length;
        const instituteCount = allMemberProfiles.filter(m => m.institute === team.institute).length;
        const isRegistered = allMemberProfiles.length === 6 && femaleCount >= 1 && instituteCount >= 3 && !!team.problemStatementId;
        const problemStatement = problemStatements.find(ps => ps.id === team.problemStatementId);
        
        return {
            ...team,
            allMembers,
            isRegistered,
            problemStatement,
        };
    });
  };

  const teamsWithDetails = useMemo(() => {
    const detailedTeams = getTeamWithFullDetails(filteredTeams);
    if (sortConfig !== null) {
      return [...detailedTeams].sort((a, b) => {
        let aVal: string = '';
        let bVal: string = '';

        if (sortConfig.key === 'teamName') {
          aVal = a.name || '';
          bVal = b.name || '';
        } else if (sortConfig.key === 'teamNumber') {
          aVal = a.teamNumber || '';
          bVal = b.teamNumber || '';
        } else {
          if (a.allMembers.length > 0 && b.allMembers.length > 0) {
            const firstMemberA = a.allMembers[0];
            const firstMemberB = b.allMembers[0];
            
            switch (sortConfig.key) {
              case 'name': aVal = firstMemberA.name || ''; bVal = firstMemberB.name || ''; break;
              case 'email': aVal = firstMemberA.email || ''; bVal = firstMemberB.email || ''; break;
              case 'enrollmentNumber': aVal = firstMemberA.enrollmentNumber || ''; bVal = firstMemberB.enrollmentNumber || ''; break;
              case 'contactNumber': aVal = firstMemberA.contactNumber || ''; bVal = firstMemberB.contactNumber || ''; break;
              default: aVal = ''; bVal = '';
            }
          }
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return detailedTeams;
  }, [filteredTeams, users, sortConfig, problemStatements]);

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

  const handleEditTeamName = (team: Team) => {
    setEditingTeamName({ id: team.id, name: team.name });
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
        if(user?.institute) fetchAllData(user.institute);
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
         if(user?.institute) fetchAllData(user.institute);
    }
  }

  const handleAssignProblemStatement = async (teamId: string) => {
    const problemStatementId = spocPsSelection[teamId];
    if (!problemStatementId) {
        toast({ title: "No Selection", description: "Please select a problem statement from the dropdown.", variant: "destructive" });
        return;
    }
    setIsSaving(`ps-${teamId}`);
    try {
        const result = await manageTeamBySpoc({
            teamId,
            action: 'assign-ps',
            problemStatementId,
        });
        if (result.success) {
            toast({ title: "Success", description: result.message });
            setSpocPsSelection(prev => ({ ...prev, [teamId]: '' })); // Clear selection
            if(user?.institute) await fetchAllData(user.institute); // Refresh data
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ title: "Error", description: `Could not assign problem statement: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(null);
    }
  };

  const handleGetInviteLink = async (teamId: string, teamName: string) => {
    setLoadingLink(teamId);
    try {
        const result = await getTeamInviteLink({
            teamId: teamId,
            teamName: teamName,
            baseUrl: appBaseUrl,
        });
        if (result.success && result.inviteLink) {
            const newInviteLinks = new Map(inviteLinks);
            newInviteLinks.set(teamId, result.inviteLink);
        } else {
            throw new Error(result.message || "Failed to get invite link.");
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setLoadingLink(null);
    }
  };

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

  const handleNominationToggle = async (teamId: string, shouldBeNominated: boolean) => {
    setIsSaving(`nominate-${teamId}`);
    try {
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, { isNominated: shouldBeNominated });
        toast({ title: "Success", description: `Team nomination status updated.` });
    } catch (error: any) {
        toast({ title: "Error", description: `Could not update nomination status: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(null);
    }
  };

  const handleGenerateForm = async (teamId: string) => {
    setIsProcessing(`gen-form-${teamId}`);
    try {
      const result = await generateNominationForm({ teamId, generatorRole: 'spoc' });
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
      } else {
        throw new Error(result.message || "Could not generate form.");
      }
    } catch(e: any) {
      toast({title: "Error", description: e.message, variant: "destructive"});
    } finally {
      setIsProcessing(null);
    }
  };


  if (authLoading || loading) {
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

  const canExportForEvaluation = evaluationExportDate ? isAfter(new Date(), evaluationExportDate) : false;

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8">
          <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                  <h1 className="text-3xl font-bold font-headline">Institute Teams</h1>
                  <p className="text-muted-foreground">View and manage all teams from <strong>{user?.institute}</strong></p>
              </div>
              <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                      <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Filter by Status" />
                      </SelectTrigger>
                      <SelectContent>
                          {statuses.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
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
                  <Select value={sihStatusFilter} onValueChange={(value) => setSihStatusFilter(value as SihStatusFilter)}>
                      <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Filter by SIH Status" />
                      </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="all">All SIH Statuses</SelectItem>
                          <SelectItem value="university">University Level</SelectItem>
                          <SelectItem value="institute">Institute Level</SelectItem>
                          <SelectItem value="none">Not Nominated</SelectItem>
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
                              {selectedProblemStatements.length > 0 ? `${selectedProblemStatements.length} PS selected` : 'Filter by PS'}
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
                          {problemStatements.length > 0 ? problemStatements.map((ps) => (
                              <DropdownMenuCheckboxItem
                                  key={ps.id}
                                  checked={selectedProblemStatements.includes(ps.id)}
                                  onCheckedChange={() => handleProblemStatementFilterChange(ps.id)}
                              >
                                  {ps.problemStatementId}
                              </DropdownMenuCheckboxItem>
                          )) : <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">No statements available</DropdownMenuLabel>}
                      </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={handleExport} disabled={isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Export Teams
                  </Button>
                 {canExportForEvaluation && (
                  <Button onClick={handleExportEvaluation} disabled={isExportingEval}>
                    {isExportingEval ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Export for Evaluation
                  </Button>
                )}
            </div>
        </header>

        <Card>
            <CardHeader>
            <CardTitle>Teams List</CardTitle>
            <CardDescription>{filteredTeams.length} team(s) found with the current filters.</CardDescription>
            </CardHeader>
            <CardContent>
                {teams.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No teams have registered from your institute yet.</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <ScrollArea className="w-full whitespace-nowrap">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('teamName')}>Team Info {getSortIndicator('teamName')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Member Name {getSortIndicator('name')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIndicator('email')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('enrollmentNumber')}>Enrollment No. {getSortIndicator('enrollmentNumber')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('contactNumber')}>Contact No. {getSortIndicator('contactNumber')}</Button></TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {teamsWithDetails.map((team) => {
                                let membersToDisplay = team.allMembers;
                                if (roleFilter === 'leader') {
                                    membersToDisplay = team.allMembers.filter(m => m.isLeader);
                                } else if (roleFilter === 'member') {
                                    membersToDisplay = team.allMembers.filter(m => !m.isLeader);
                                }
                                if (membersToDisplay.length === 0) return null;

                                return membersToDisplay.map((member, memberIndex) => (
                                    <TableRow key={`${team.id}-${member.uid || memberIndex}-${roleFilter}`}>
                                        {memberIndex === 0 && (
                                            <TableCell rowSpan={membersToDisplay.length} className="font-medium align-top pt-6">
                                                <div className="flex flex-col gap-2 items-start w-64">
                                                    {editingTeamName?.id === team.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <Input 
                                                                value={editingTeamName.name}
                                                                onChange={(e) => setEditingTeamName({ ...editingTeamName, name: e.target.value })}
                                                                className="w-40 h-8"
                                                                disabled={isSaving === `name-${team.id}`}
                                                            />
                                                            <Button size="icon" className="h-8 w-8" onClick={() => handleSaveTeamName(team.id)} disabled={isSaving === `name-${team.id}`}>
                                                                {isSaving === `name-${team.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTeamName(null)} disabled={isSaving === `name-${team.id}`}>
                                                                <X className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group">
                                                            <span className="font-bold text-base">{team.name}</span>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleEditTeamName(team)}>
                                                                <Pencil className="h-4 w-4 text-muted-foreground"/>
                                                            </Button>
                                                        </div>
                                                    )}
                                                     <div className="flex flex-wrap items-center gap-2">
                                                        {team.isRegistered ? <Badge className="bg-green-600 hover:bg-green-700">Registered</Badge> : <Badge variant="destructive">Pending</Badge>}
                                                        {team.sihSelectionStatus === 'university' && <Badge className="bg-blue-500 hover:bg-blue-600">Nominated for SIH (Univ. Level)</Badge>}
                                                        {team.sihSelectionStatus === 'institute' && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge className="bg-purple-500 hover:bg-purple-600 cursor-help">Nominated for SIH (Inst. Level)</Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{team.isNominated ? 'By You' : 'By Admin'}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {team.teamNumber && <Badge variant="secondary">#{team.teamNumber}</Badge>}
                                                        {team.universityTeamId && <Badge variant="secondary">Univ. ID: {team.universityTeamId}</Badge>}
                                                    </div>
                                                     {team.problemStatement ? 
                                                        <div className="whitespace-normal text-xs text-muted-foreground">
                                                            <FileText className="inline h-3 w-3 mr-1"/>
                                                            {team.problemStatement.problemStatementId}: {team.problemStatement.title}
                                                        </div>
                                                        : canSpocSelectPs ? (
                                                            <div className="flex flex-col gap-2 items-start w-[250px] pt-2">
                                                                <Select onValueChange={(psId) => setSpocPsSelection(prev => ({...prev, [team.id]: psId}))}>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select a PS..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {problemStatements.map(ps => (
                                                                            <SelectItem key={ps.id} value={ps.id}>{ps.problemStatementId} - {ps.title}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button size="sm" onClick={()={() => handleAssignProblemStatement(team.id)} disabled={!spocPsSelection[team.id] || isSaving === `ps-${team.id}`}>
                                                                    {isSaving === `ps-${team.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                                                    Assign
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="destructive">Not Selected</Badge>
                                                        )
                                                    }
                                                     <div className="flex items-center gap-2 mt-2">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2">
                                                                    <Label htmlFor={`nominate-${team.id}`} className="text-xs font-normal">Nominate (Inst.)</Label>
                                                                    <Switch
                                                                        id={`nominate-${team.id}`}
                                                                        checked={team.sihSelectionStatus === 'institute' || team.isNominated}
                                                                        onCheckedChange={(checked) => handleNominationToggle(team.id, checked)}
                                                                        disabled={isSaving === `nominate-${team.id}` || team.sihSelectionStatus === 'university' || !!team.isLocked || team.sihSelectionStatus === 'institute'}
                                                                    />
                                                                </div>
                                                            </TooltipTrigger>
                                                            { (team.sihSelectionStatus === 'institute' || team.sihSelectionStatus === 'university' || team.isLocked) && (
                                                                <TooltipContent>
                                                                    <p>
                                                                        {team.isLocked ? "Team is locked." : "This team's nomination status has been finalized by an admin."}
                                                                    </p>
                                                                </TooltipContent>
                                                            )}
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            {member.enrollmentNumber ? (
                                                <Link href={`/profile/${member.enrollmentNumber}`} className="hover:underline">
                                                    {member.name} {member.isLeader && <Badge variant="secondary" className="ml-1">Leader</Badge>}
                                                </Link>
                                            ) : (
                                                `${member.name} ${member.isLeader ? '(Leader)' : ''}`
                                            )}
                                        </TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.enrollmentNumber || 'N/A'}</TableCell>
                                        <TableCell>
                                            {member.contactNumber ? (
                                                <a href={`https://wa.me/+91${member.contactNumber}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    {member.contactNumber}
                                                </a>
                                            ) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              {memberIndex === 0 && (
                                                <div className="flex items-center gap-2">
                                                  <TooltipProvider>
                                                      <Tooltip>
                                                          <TooltipTrigger asChild>
                                                              <Button
                                                                  variant="outline"
                                                                  size="icon"
                                                                  className="h-8 w-8"
                                                                  onClick={() => handleGenerateForm(team.id)}
                                                                  disabled={isProcessing === `gen-form-${team.id}` || !team.mentor}
                                                              >
                                                                  {isProcessing === `gen-form-${team.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                                              </Button>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                              <p>{!team.mentor ? "Leader must add mentor details first." : "Generate Nomination Form"}</p>
                                                          </TooltipContent>
                                                      </Tooltip>
                                                  </TooltipProvider>
                                                   <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="icon" className="h-8 w-8" disabled={isProcessing === team.id}>
                                                                <Trash2 className="h-4 w-4"/>
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
                                              )}

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
                                                          <AlertDialogAction onClick={()={() => handleRemoveMember(team.id, member)} className="bg-destructive hover:bg-destructive/90">Remove Member</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                              )}
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ));
                              })}
                              </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-4">
                        {teamsWithDetails.map((team) => {
                          let membersToDisplay = team.allMembers;
                          if (roleFilter === 'leader') {
                              membersToDisplay = team.allMembers.filter(m => m.isLeader);
                          } else if (roleFilter === 'member') {
                              membersToDisplay = team.allMembers.filter(m => !m.isLeader);
                          }
                          if (membersToDisplay.length === 0) return null;

                          return (
                              <Card key={team.id} className="p-4">
                                  <CardHeader className="p-0 mb-4">
                                  <CardTitle className="flex justify-between items-start">
                                      <span>{team.name}</span>
                                      {team.teamNumber && <Badge variant="outline">#{team.teamNumber}</Badge>}
                                  </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-0 space-y-3">
                                  {membersToDisplay.map(member => (
                                      <div key={member.uid || member.email} className="text-sm border-t pt-3">
                                      <div className="flex justify-between items-center">
                                          <p className="font-semibold">{member.name} {member.isLeader && <span className="text-xs font-normal text-primary">(Leader)</span>}</p>
                                          {!member.isLeader && (
                                              <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={isProcessing === `${team.id}-${member.uid}`}>
                                                          {isProcessing === `${team.id}-${member.uid}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <MinusCircle className="h-4 w-4"/>}
                                                      </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                      <AlertDialogHeader>
                                                          <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                              Are you sure you want to remove {member.name} from this team?
                                                          </AlertDialogDescription>
                                                      </AlertDialogHeader>
                                                      <AlertDialogFooter>
                                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                          <AlertDialogAction onClick={() => handleRemoveMember(team.id, member)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                                                      </AlertDialogFooter>
                                                  </AlertDialogContent>
                                              </AlertDialog>
                                          )}
                                      </div>
                                      <p className="text-muted-foreground select-text">{member.email}</p>
                                      <p className="text-muted-foreground">{member.enrollmentNumber}</p>
                                      </div>
                                  ))}
                                  </CardContent>
                              </Card>
                          )
                        })}
                      </div>
                    </>
                  )}
              </CardContent>
          </Card>
      </div>
    </TooltipProvider>
  );
}

    