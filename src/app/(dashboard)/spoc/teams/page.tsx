
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Save, Pencil, X, Trash2, Users, User, MinusCircle, ArrowUpDown, Link as LinkIcon, Copy, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { Team, UserProfile, TeamMember } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
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
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { Download } from "lucide-react";
import { Buffer } from 'buffer';
import { getTeamInviteLink } from "@/ai/flows/get-team-invite-link-flow";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

type SortKey = 'teamName' | 'teamNumber' | 'name' | 'email' | 'enrollmentNumber' | 'contactNumber';
type SortDirection = 'asc' | 'desc';

export default function SpocTeamsPage() {
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
  const appBaseUrl = "https://vadodarahackathon.pierc.org";

  const fetchInstituteData = useCallback((institute: string) => {
    setLoading(true);
    const teamsQuery = query(collection(db, "teams"), where("institute", "==", institute));
    
    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsData);

        const allUserIds = new Set<string>();
        teamsData.forEach(team => {
            allUserIds.add(team.leader.uid);
            team.members.forEach(member => {
                if (member.uid) allUserIds.add(member.uid);
            });
        });

        const userUnsubscribers: (()=>void)[] = [];
        if (allUserIds.size > 0) {
            Array.from(allUserIds).forEach(uid => {
                const userDocRef = doc(db, 'users', uid);
                const unsub = onSnapshot(userDocRef, (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
                        setUsers(prevUsers => new Map(prevUsers).set(uid, userData));
                    }
                }, (error) => {
                    console.error(`Failed to listen to user ${uid}`, error);
                });
                userUnsubscribers.push(unsub);
            });
        }
        
        setLoading(false);

        return () => userUnsubscribers.forEach(unsub => unsub());
    }, (error) => {
        console.error("Error listening to team updates:", error);
        toast({ title: "Error", description: "Could not load real-time team data.", variant: "destructive" });
        setLoading(false);
    });

    return unsubscribeTeams;
  }, [toast]);

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
    let unsubscribe: (() => void) | undefined;
    if (user && user.institute) {
      unsubscribe = fetchInstituteData(user.institute);
    } else if (!authLoading) {
      setLoading(false);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline">Institute Teams</h1>
                <p className="text-muted-foreground">View and manage all teams from <strong>{user?.institute}</strong></p>
            </div>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Teams
            </Button>
        </header>

        <Card>
            <CardHeader>
            <CardTitle>Teams List</CardTitle>
            <CardDescription>{teams.length} team(s) registered from your institute.</CardDescription>
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
                                <TableHead><Button variant="ghost" onClick={() => requestSort('teamName')}>Team Name {getSortIndicator('teamName')}</Button></TableHead>
                                <TableHead><Button variant="ghost" onClick={() => requestSort('teamNumber')}>Team No. {getSortIndicator('teamNumber')}</Button></TableHead>
                                <TableHead>Invite Link</TableHead>
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
                                    {memberIndex === 0 && (
                                        <TableCell rowSpan={team.allMembers.length} className="align-top">
                                            {inviteLinks.has(team.id) ? (
                                                <div className="flex items-center gap-1">
                                                    <Input value={inviteLinks.get(team.id)} readOnly className="h-8 text-xs"/>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => {
                                                        navigator.clipboard.writeText(inviteLinks.get(team.id)!);
                                                        toast({ title: "Copied!" });
                                                    }}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleGetInviteLink(team.id, team.name)}
                                                    disabled={loadingLink === team.id}
                                                >
                                                    {loadingLink === team.id ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <LinkIcon className="mr-2 h-4 w-4" />
                                                    )}
                                                    Get Link
                                                </Button>
                                            )}
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
                      </ScrollArea>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {teamsWithDetails.map((team) => (
                        <Card key={team.id} className="p-4">
                            <CardHeader className="p-0 mb-4">
                              <CardTitle className="flex justify-between items-start">
                                  <span>{team.name}</span>
                                  {team.teamNumber && <Badge variant="outline">#{team.teamNumber}</Badge>}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 space-y-3">
                              {team.allMembers.map(member => (
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
                                  <p className="text-muted-foreground">{member.email}</p>
                                  <p className="text-muted-foreground">{member.enrollmentNumber}</p>
                                </div>
                              ))}
                            </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
