
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Team, UserProfile, TeamMember, TeamInvite, Notification } from "@/lib/types";
import { AlertCircle, CheckCircle, PlusCircle, Trash2, User, Loader2, FileText, Pencil, Users2, Badge, ArrowUpDown, Link as LinkIcon, Copy, RefreshCw, Bell, X as CloseIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayRemove, collection, query, where, getDocs, writeBatch, addDoc, serverTimestamp, limit, deleteDoc, setDoc, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AnnouncementsSection } from "./announcements-section";
import Link from "next/link";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { getTeamInviteLink } from "@/ai/flows/get-team-invite-link-flow";

type SortKey = 'name' | 'role' | 'email' | 'contactNumber' | 'enrollmentNumber' | 'yearOfStudy' | 'semester';
type SortDirection = 'asc' | 'desc';

function NotificationsSection() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "notifications"),
            where("recipientUid", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        const notifRef = doc(db, 'notifications', id);
        await updateDoc(notifRef, { read: true });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="text-primary"/> Notifications
                </CardTitle>
                <CardDescription>Updates about your team and the event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                : notifications.length > 0 ? (
                    notifications.map(notif => (
                        <div key={notif.id} className={`p-3 border-l-4 rounded-r-md relative ${notif.read ? 'border-border/30 bg-secondary/20' : 'border-primary/50 bg-secondary/50'}`}>
                             <h4 className="font-semibold">{notif.title}</h4>
                             <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                             <p className="text-xs text-muted-foreground mt-2">{new Date(notif.createdAt?.seconds * 1000).toLocaleString()}</p>
                             {!notif.read && (
                                 <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleMarkAsRead(notif.id)}>
                                     <CloseIcon className="h-4 w-4"/>
                                 </Button>
                             )}
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-4">No new notifications.</p>
                )}
            </CardContent>
        </Card>
    );
}


export default function LeaderDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);
  const { toast } = useToast();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const appBaseUrl = "https://vadodarahackathon.pierc.org";

  const fetchTeamAndMembers = useCallback(() => {
    if (!user?.teamId) {
      setLoading(false);
      return () => {};
    }
    setLoading(true);

    const teamDocRef = doc(db, 'teams', user.teamId);

    const unsubscribeTeam = onSnapshot(teamDocRef, (teamDoc) => {
      if (!teamDoc.exists()) {
        setTeam(null);
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
      setTeam(teamData);

      const memberUIDs = teamData.members.map(m => m.uid).filter(Boolean);
      const allUIDs = [...new Set([teamData.leader.uid, ...memberUIDs])];
      
      const memberUnsubscribers: (() => void)[] = [];

      allUIDs.forEach(uid => {
        const userDocRef = doc(db, 'users', uid);
        const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const memberData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
            setTeamMembers(prevMembers => {
              const memberExists = prevMembers.some(m => m.uid === memberData.uid);
              if (memberExists) {
                return prevMembers.map(m => m.uid === memberData.uid ? memberData : m);
              }
              return [...prevMembers, memberData];
            });
          }
        });
        memberUnsubscribers.push(unsubscribeUser);
      });
      
      setLoading(false);

      return () => {
        memberUnsubscribers.forEach(unsub => unsub());
      };
    }, (error) => {
      console.error("Error fetching team data:", error);
      toast({ title: "Error", description: "Failed to fetch team data.", variant: "destructive" });
      setLoading(false);
    });

    return unsubscribeTeam;

  }, [user?.teamId, toast]);

  useEffect(() => {
    const unsubscribe = fetchTeamAndMembers();
    return () => unsubscribe();
  }, [fetchTeamAndMembers]);
  
  useEffect(() => {
    if (!team) return;

    const getOrCreateInviteLink = async () => {
        setIsLoadingLink(true);
        try {
            const result = await getTeamInviteLink({
                teamId: team.id,
                teamName: team.name,
                baseUrl: appBaseUrl,
            });

            if (result.success && result.inviteLink) {
                setInviteLink(result.inviteLink);
            } else {
                throw new Error(result.message || "Failed to get invite link.");
            }
        } catch (error) {
            console.error("Error getting or creating invite link:", error);
            toast({ title: "Error", description: "Could not retrieve the invite link.", variant: "destructive" });
        } finally {
            setIsLoadingLink(false);
        }
    };

    getOrCreateInviteLink();
  }, [team, appBaseUrl, toast]);


  const handleRemoveMember = async (memberToRemove: UserProfile) => {
    if (!team) return;
    setIsRemoving(memberToRemove.email);

    try {
        const batch = writeBatch(db);
        const teamDocRef = doc(db, "teams", team.id);

        const memberDataForRemoval = team.members.find(m => m.email === memberToRemove.email);
        if (!memberDataForRemoval) {
            toast({ title: "Error", description: "Could not find member data to remove.", variant: "destructive" });
            return;
        }

        // 1. Remove member from the team's array
        batch.update(teamDocRef, {
            members: arrayRemove(memberDataForRemoval)
        });

        // 2. Find the user by email and clear their teamId and role
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", memberToRemove.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userDocRef = doc(db, "users", userDoc.id);
            batch.update(userDocRef, { teamId: "" }); // keep role
        }

        await batch.commit();
        toast({ title: "Success", description: "Team member removed." });
    } catch (error) {
        console.error("Error removing member:", error);
        toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    } finally {
        setIsRemoving(null);
    }
  };
  
  const sortedTeamMembers = useMemo(() => {
    let sortableItems = [...teamMembers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
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
    return sortableItems;
  }, [teamMembers, sortConfig]);

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


  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !team) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Could not load your team data. Please try again later or contact support if you believe this is an error.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const teamValidation = {
    memberCount: {
        current: teamMembers.length,
        required: 6,
        isMet: teamMembers.length === 6,
    },
    femaleCount: {
        current: teamMembers.filter(m => m.gender === "Female").length,
        required: 1,
        isMet: teamMembers.filter(m => m.gender === "Female").length >= 1,
    }
  }

  const canAddMoreMembers = teamMembers.length < 6;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Team Dashboard: {team.name}</h1>
            <p className="text-muted-foreground">Manage your team and review your registration status.</p>
        </header>

        <Card className="mb-8 w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users2 />
                    Team Members ({teamMembers.length} / 6)
                    {team.teamNumber && <Badge variant="secondary" className="ml-auto">{`Team No: ${team.teamNumber}`}</Badge>}
                </CardTitle>
                <CardDescription>Your current team roster. Invite members using the link below.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('name')}>Name {getSortIndicator('name')}</Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('role')}>Role {getSortIndicator('role')}</Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIndicator('email')}</Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('contactNumber')}>Contact No. {getSortIndicator('contactNumber')}</Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => requestSort('enrollmentNumber')}>Enrollment No. {getSortIndicator('enrollmentNumber')}</Button>
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
                        {sortedTeamMembers.length > 0 ? (
                            sortedTeamMembers.map((member) => (
                                <TableRow key={member.uid}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                                            {member.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>{member.contactNumber || 'N/A'}</TableCell>
                                    <TableCell>{member.enrollmentNumber || 'N/A'}</TableCell>
                                    <TableCell>{member.yearOfStudy || 'N/A'}</TableCell>
                                    <TableCell>{member.semester || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        {member.role !== 'leader' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={isRemoving === member.email}>
                                                    {isRemoving === member.email ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action will remove {member.name} from the team. They will need to be invited again to rejoin.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRemoveMember(member)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                         ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                    {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto"/> : 'Your details are shown. Invite members to add them to the team.'}
                                </TableCell>
                            </TableRow>
                         )
                       }
                    </TableBody>
                </Table>
            </CardContent>
         </Card>

        <div className="grid gap-8 lg:grid-cols-3">
             <div className="lg:col-span-2 grid grid-cols-1 gap-8">
                <AnnouncementsSection audience="teams_and_all" />
                <NotificationsSection />
            </div>
            
            <div className="space-y-8 lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle>Team Status</CardTitle>
                        <CardDescription>Check if your team meets the hackathon requirements.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {teamValidation.memberCount.isMet ? (
                            <Alert variant="default" className="border-green-500">
                                <CheckCircle className="h-4 w-4 text-green-500"/>
                                <AlertTitle>Team Size Correct</AlertTitle>
                                <AlertDescription>You have 6 members in your team. Great job!</AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertTitle>Incomplete Team</AlertTitle>
                                <AlertDescription>Your team needs {teamValidation.memberCount.required - teamValidation.memberCount.current} more member(s) to reach the required 6.</AlertDescription>
                            </Alert>
                        )}

                        {teamValidation.femaleCount.isMet ? (
                            <Alert variant="default" className="border-green-500">
                                <CheckCircle className="h-4 w-4 text-green-500"/>
                                <AlertTitle>Female Representation Met</AlertTitle>
                                <AlertDescription>Your team includes at least one female member. Thank you!</AlertDescription>
                            </Alert>
                        ) : (
                             <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4"/>
                                <AlertTitle>Female Representation Required</AlertTitle>
                                <AlertDescription>Your team must include at least one female member.</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Problem Statement & Category</CardTitle>
                        <CardDescription>Select a problem statement. Your team's category will be set automatically.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {team.problemStatementId ? (
                            <div className="space-y-3">
                                <p className="text-muted-foreground">Your team has selected:</p>
                                <h3 className="text-lg font-semibold">{team.problemStatementTitle}</h3>
                                <p className="text-sm">Team Category: <span className="font-semibold">{team.category}</span></p>
                                 <Button variant="outline" asChild>
                                    <Link href="/leader/select-problem-statement">
                                        <Pencil className="mr-2 h-4 w-4" /> Change Problem Statement
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-start gap-4">
                                <p>Your team has not selected a problem statement yet.</p>
                                <Button asChild>
                                   <Link href="/leader/select-problem-statement">
                                        <FileText className="mr-2 h-4 w-4" /> Select Problem Statement
                                   </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <LinkIcon /> Invite Members
                        </CardTitle>
                        <CardDescription>
                            {canAddMoreMembers ? `Share this permanent link to invite members to your team.` : "Your team is full."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       {canAddMoreMembers ? (
                        <div className="space-y-4">
                           {isLoadingLink ? (
                                <div className="flex items-center justify-center h-10">
                                    <Loader2 className="h-6 w-6 animate-spin"/>
                                </div>
                           ) : inviteLink ? (
                            <div className="flex items-center gap-2">
                                <Input value={inviteLink} readOnly className="text-sm"/>
                                <Button size="icon" variant="outline" onClick={() => {
                                    navigator.clipboard.writeText(inviteLink);
                                    toast({ title: "Copied!", description: "Invite link copied to clipboard." });
                                }}>
                                    <Copy className="h-4 w-4"/>
                                </Button>
                            </div>
                           ) : (
                            <p className="text-sm text-muted-foreground">Could not load the invite link.</p>
                           )}
                        </div>
                       ): (
                        <p className="text-sm text-muted-foreground">You have reached the maximum number of team members.</p>
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
