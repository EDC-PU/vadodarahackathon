
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Team, UserProfile, TeamMember, TeamInvite, Notification } from "@/lib/types";
import { AlertCircle, CheckCircle, PlusCircle, Trash2, User, Loader2, FileText, Pencil, Users2, Badge as BadgeIcon, ArrowUpDown, Link as LinkIcon, Copy, RefreshCw, Bell, X as CloseIcon } from "lucide-react";
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
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

type SortKey = 'name' | 'role' | 'email' | 'contactNumber' | 'enrollmentNumber' | 'yearOfStudy' | 'semester';
type SortDirection = 'asc' | 'desc';

function NotificationsSection() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

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
        }, (error) => {
            console.error("Error fetching notifications:", error);
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
  const [deadline, setDeadline] = useState<Date | null>(null);
  const appBaseUrl = "https://vadodarahackathon.pierc.org";

  useEffect(() => {
    const fetchDeadline = async () => {
        try {
            const configDocRef = doc(db, "config", "event");
            const configDoc = await getDoc(configDocRef);
            if (configDoc.exists() && configDoc.data()?.registrationDeadline) {
                setDeadline(configDoc.data().registrationDeadline.toDate());
            }
        } catch (error) {
            console.error("Could not fetch registration deadline:", error);
        }
    };
    fetchDeadline();
  }, []);

  useEffect(() => {
    if (!user?.teamId) {
      setLoading(false);
      return;
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
      
      const unsubscribers = allUIDs.map(uid => {
        const userDocRef = doc(db, 'users', uid);
        return onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
            setTeamMembers(prevMembers => {
              const otherMembers = prevMembers.filter(m => m.uid !== uid);
              return [...otherMembers, userProfile];
            });
          }
        });
      });
      
      setLoading(false);

      return () => unsubscribers.forEach(unsub => unsub());

    }, (error) => {
      console.error("Error fetching team data:", error);
      toast({ title: "Error", description: "Failed to fetch team data.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribeTeam();
  }, [user?.teamId, toast]);
  
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

        // 2. Find the user by email and clear their teamId
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", memberToRemove.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userDocRef = doc(db, "users", userDoc.id);
            batch.update(userDocRef, { teamId: "" });
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
    const leader = teamMembers.find(m => m.uid === user?.uid);
    const members = teamMembers.filter(m => m.uid !== user?.uid);

    if (sortConfig !== null) {
      members.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof UserProfile] as any ?? '';
        const bValue = b[sortConfig.key as keyof UserProfile] as any ?? '';
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return leader ? [leader, ...members] : members;
  }, [teamMembers, sortConfig, user?.uid]);

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
        current: team.members.length + 1,
        required: 6,
        isMet: team.members.length + 1 === 6,
    },
    femaleCount: {
        current: team.members.filter(m => m.gender === "F").length + (teamMembers.find(m => m.uid === team.leader.uid)?.gender === 'F' ? 1 : 0),
        required: 1,
        isMet: (team.members.filter(m => m.gender === "F").length + (teamMembers.find(m => m.uid === team.leader.uid)?.gender === 'F' ? 1 : 0)) >= 1,
    },
    isRegistered() {
      return this.memberCount.isMet && this.femaleCount.isMet;
    }
  };

  const canAddMoreMembers = teamValidation.memberCount.current < 6;
  const isDeadlinePassed = deadline ? new Date() > deadline : false;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold font-headline">Team Dashboard: {team.name}</h1>
              <p className="text-muted-foreground">Manage your team and review your registration status.</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status: </span>
                {teamValidation.isRegistered() ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600">Registered</Badge>
                ) : (
                    <Badge variant="destructive">Registration Pending</Badge>
                )}
            </div>
        </header>

        <Card className="mb-8 w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users2 />
                    Team Members ({teamValidation.memberCount.current} / 6)
                    {team.teamNumber && <Badge variant="secondary" className="ml-auto">{`Team No: ${team.teamNumber}`}</Badge>}
                </CardTitle>
                <CardDescription>Your current team roster. Invite members using the link below.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <ScrollArea className="w-full whitespace-nowrap">
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
                              sortedTeamMembers.map((member, index) => {
                                  const isLeader = member.uid === user.uid;
                                  const role = isLeader ? 'Leader' : `Member`;
                                  return (
                                  <TableRow key={member.uid}>
                                      <TableCell className="font-medium">
                                        {member.enrollmentNumber ? (
                                              <Link href={`/profile/${member.enrollmentNumber}`} className="hover:underline">
                                                  {member.name}
                                              </Link>
                                          ) : (
                                              member.name
                                          )}
                                      </TableCell>
                                      <TableCell>
                                          <Badge variant={isLeader ? 'default' : 'secondary'} className="capitalize">
                                              {role}
                                          </Badge>
                                      </TableCell>
                                      <TableCell>{member.email}</TableCell>
                                      <TableCell>
                                          {member.contactNumber ? (
                                              <a href={`https://wa.me/+91${member.contactNumber}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                  {member.contactNumber}
                                              </a>
                                          ) : 'N/A'}
                                      </TableCell>
                                      <TableCell>{member.enrollmentNumber || 'N/A'}</TableCell>
                                      <TableCell>{member.yearOfStudy || 'N/A'}</TableCell>
                                      <TableCell>{member.semester || 'N/A'}</TableCell>
                                      <TableCell className="text-right">
                                          {!isLeader && (
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
                              )})
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
                  </ScrollArea>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {sortedTeamMembers.length > 0 ? (
                    sortedTeamMembers.map((member) => {
                      const isLeader = member.uid === user.uid;
                      return (
                        <Card key={member.uid} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold">{member.name}</h3>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            <Badge variant={isLeader ? 'default' : 'secondary'} className="capitalize">{isLeader ? 'Leader' : 'Member'}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                              <div className="flex flex-col"><span>Enrollment:</span> <span className="font-medium text-foreground">{member.enrollmentNumber || 'N/A'}</span></div>
                              <div className="flex flex-col"><span>Contact:</span> <span className="font-medium text-foreground">{member.contactNumber || 'N/A'}</span></div>
                              <div className="flex flex-col"><span>Year:</span> <span className="font-medium text-foreground">{member.yearOfStudy || 'N/A'}</span></div>
                              <div className="flex flex-col"><span>Semester:</span> <span className="font-medium text-foreground">{member.semester || 'N/A'}</span></div>
                          </div>
                           {!isLeader && (
                              <div className="mt-4 pt-4 border-t flex justify-end">
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="sm" disabled={isRemoving === member.email}>
                                          {isRemoving === member.email ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                          <span className="ml-2">Remove</span>
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>This action will remove {member.name} from the team.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleRemoveMember(member)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </div>
                           )}
                        </Card>
                      )
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                       {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto"/> : 'Your details are shown. Invite members to add them to the team.'}
                    </div>
                  )}
                </div>
            </CardContent>
         </Card>

        <div className="grid gap-8 lg:grid-cols-2">
             <div className="space-y-8">
                <AnnouncementsSection audience="teams_and_all" />
                <NotificationsSection />
            </div>
            
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Team Status</CardTitle>
                        <CardDescription>Check if your team meets the hackathon requirements.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {teamValidation.isRegistered() ? (
                             <Alert variant="default" className="border-green-500">
                                <CheckCircle className="h-4 w-4 text-green-500"/>
                                <AlertTitle>Team is Officially Registered!</AlertTitle>
                                <AlertDescription>Your team meets all the registration criteria. Good luck!</AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Registration Incomplete</AlertTitle>
                                <AlertDescription>Your team does not yet meet all the criteria for official registration. See details below.</AlertDescription>
                            </Alert>
                        )}
                        
                        <hr className="border-border/50" />

                        {teamValidation.memberCount.isMet ? (
                            <Alert variant="default" className="border-green-500/50 bg-transparent text-foreground">
                                <CheckCircle className="h-4 w-4 text-green-500"/>
                                <AlertTitle>Team Size Correct</AlertTitle>
                                <AlertDescription>You have {teamValidation.memberCount.current} members in your team. Great job!</AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive" className="bg-transparent text-foreground">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <AlertTitle>Incomplete Team</AlertTitle>
                                <AlertDescription>Your team needs {teamValidation.memberCount.required - teamValidation.memberCount.current} more member(s) to reach the required 6.</AlertDescription>
                            </Alert>
                        )}

                        {teamValidation.femaleCount.isMet ? (
                            <Alert variant="default" className="border-green-500/50 bg-transparent text-foreground">
                                <CheckCircle className="h-4 w-4 text-green-500"/>
                                <AlertTitle>Female Representation Met</AlertTitle>
                                <AlertDescription>Your team includes at least one female member. Thank you!</AlertDescription>
                            </Alert>
                        ) : (
                             <Alert variant="destructive" className="bg-transparent text-foreground">
                                <AlertCircle className="h-4 w-4 text-destructive"/>
                                <AlertTitle>Female Representation Required</AlertTitle>
                                <AlertDescription>Your team must include at least one female member.</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Problem Statement & Category</CardTitle>
                        <CardDescription>
                            {isDeadlinePassed 
                                ? "The deadline for changing problem statements has passed." 
                                : "Select a problem statement. Your team's category will be set automatically."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {team.problemStatementId ? (
                            <div className="space-y-3">
                                <p className="text-muted-foreground">Your team has selected:</p>
                                <h3 className="text-lg font-semibold">{team.problemStatementTitle}</h3>
                                <p className="text-sm">Team Category: <span className="font-semibold">{team.category}</span></p>
                                 <Button variant="outline" asChild disabled={isDeadlinePassed}>
                                    <Link href="/leader/select-problem-statement">
                                        <Pencil className="mr-2 h-4 w-4" /> Change Problem Statement
                                    </Link>
                                </Button>
                                {isDeadlinePassed && <p className="text-xs text-destructive mt-2">The deadline was on {deadline?.toLocaleDateString()}</p>}
                            </div>
                        ) : (
                            <div className="flex flex-col items-start gap-4">
                                <p>Your team has not selected a problem statement yet.</p>
                                <Button asChild disabled={isDeadlinePassed}>
                                   <Link href="/leader/select-problem-statement">
                                        <FileText className="mr-2 h-4 w-4" /> Select Problem Statement
                                   </Link>
                                </Button>
                                {isDeadlinePassed && <p className="text-xs text-destructive mt-2">The deadline was on {deadline?.toLocaleDateString()}</p>}
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
