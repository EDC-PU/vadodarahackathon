

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Save, Pencil, X, Trash2, Users, User, MinusCircle, ArrowUpDown, Link as LinkIcon, Copy, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { Team, UserProfile, TeamMember, Institute } from "@/lib/types";
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
import { getInstituteTeams } from "@/ai/flows/get-institute-teams-flow";
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { Download, FileSpreadsheet } from "lucide-react";
import { Buffer } from 'buffer';
import { getTeamInviteLink } from "@/ai/flows/get-team-invite-link-flow";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { isAfter, startOfDay } from 'date-fns';
import Link from "next/link";

type SortKey = 'teamName' | 'teamNumber' | 'name' | 'email' | 'enrollmentNumber' | 'contactNumber';
type SortDirection = 'asc' | 'desc';

export default function SpocDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<{ id: string, name: string } | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);
  const { toast } = useToast();
  const [inviteLinks, setInviteLinks] = useState<Map<string, string>>(new Map());
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const [evaluationExportDate, setEvaluationExportDate] = useState<Date | null>(null);
  const [instituteData, setInstituteData] = useState<Institute | null>(null);
  const appBaseUrl = "https://vadodarahackathon.pierc.org";
  
  useEffect(() => {
    if (!user?.institute) return;

    const q = query(collection(db, "institutes"), where("name", "==", user.institute));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data() as Institute;
            setInstituteData(data);
        }
    });

    return () => unsubscribe();
  }, [user?.institute]);
  
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "event"));
        if (configDoc.exists() && configDoc.data()?.evaluationExportDate) {
          setEvaluationExportDate(configDoc.data().evaluationExportDate.toDate());
        }
      } catch (error) {
        console.error("Failed to fetch evaluation export date", error);
      }
    };
    fetchConfig();
  }, []);

  const fetchInstituteData = useCallback(async () => {
    if (!user?.institute) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
        const result = await getInstituteTeams({ institute: user.institute });
        if (result.success && result.teams && result.users) {
            setTeams(result.teams);
            setUsers(new Map(Object.entries(result.users)));
        } else {
            throw new Error(result.message || "Failed to fetch institute data.");
        }
    } catch (error: any) {
        toast({ title: "Error", description: `Could not load institute data: ${error.message}`, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [user?.institute, toast]);


  const handleExport = async () => {
    setIsExporting(true);
    try {
        if (!user?.institute) {
            throw new Error("Institute information not available");
        }
        
        const result = await exportTeams({ institute: user.institute, category: "All Categories" });
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

  useEffect(() => {
    if (user && user.institute) {
      fetchInstituteData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, fetchInstituteData]);
  
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
        let aVal: string = '';
        let bVal: string = '';

        // Handle team properties
        if (sortConfig.key === 'teamName') {
          aVal = a.name || '';
          bVal = b.name || '';
        } else if (sortConfig.key === 'teamNumber') {
          aVal = a.teamNumber || '';
          bVal = b.teamNumber || '';
        } else {
          // For member properties, we'll sort by the first member's value
          if (a.allMembers.length > 0 && b.allMembers.length > 0) {
            const firstMemberA = a.allMembers[0];
            const firstMemberB = b.allMembers[0];
            
            switch (sortConfig.key) {
              case 'name':
                aVal = firstMemberA.name || '';
                bVal = firstMemberB.name || '';
                break;
              case 'email':
                aVal = firstMemberA.email || '';
                bVal = firstMemberB.email || '';
                break;
              case 'enrollmentNumber':
                aVal = firstMemberA.enrollmentNumber || '';
                bVal = firstMemberB.enrollmentNumber || '';
                break;
              case 'contactNumber':
                aVal = firstMemberA.contactNumber || '';
                bVal = firstMemberB.contactNumber || '';
                break;
              default:
                aVal = '';
                bVal = '';
            }
          }
        }

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
          await fetchInstituteData(); // Refresh data
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
        fetchInstituteData();
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
        fetchInstituteData();
    }
  }

  const handleGetInviteLink = async (teamId: string, teamName: string) => {
    setLoadingLink(teamId);
    try {
        const result = await getTeamInviteLink({
            teamId: teamId,
            teamName: teamName,
            baseUrl: appBaseUrl,
        });
        if (result.success && result.inviteLink) {
            setInviteLinks(prev => new Map(prev).set(teamId, result.inviteLink!));
        } else {
            throw new Error(result.message || "Failed to get invite link.");
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setLoadingLink(null);
    }
  };

  if (authLoading) {
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

  const totalParticipants = teams ? teams.reduce((acc, team) => acc + 1 + team.members.length, 0) : 0;
  const canExportForEvaluation = evaluationExportDate ? isAfter(new Date(), evaluationExportDate) : false;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">SPOC Dashboard</h1>
            <p className="text-muted-foreground">Manage teams from your institute: <strong>{user?.institute}</strong></p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button onClick={fetchInstituteData} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh Data
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Teams
            </Button>
        </div>
      </header>

      {instituteData && !instituteData.evaluationDates && (
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Action Required: Set Your Hackathon Dates</AlertTitle>
          <AlertDescription>
            Please go to the "Evaluation & Nomination" page to set the internal hackathon dates for your institute. This is a required step.
            <Button asChild variant="link" className="p-0 pl-2 h-auto text-destructive-foreground font-bold">
              <Link href="/spoc/evaluation">Set Dates Now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}


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

    </div>
  );
}
