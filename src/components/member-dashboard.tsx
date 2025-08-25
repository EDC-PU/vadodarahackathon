
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Phone, Mail, FileText, Trophy, Calendar, Loader2, AlertCircle, ArrowUpDown, CheckCircle, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { AnnouncementsSection } from "./announcements-section";
import { InvitationsSection } from "./invitations-section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
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
import { useToast } from "@/hooks/use-toast";
import { leaveTeam } from "@/ai/flows/leave-team-flow";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";


type SortKey = 'name' | 'role' | 'email' | 'contactNumber' | 'enrollmentNumber' | 'yearOfStudy' | 'semester';
type SortDirection = 'asc' | 'desc';

export default function MemberDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [spoc, setSpoc] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const { toast } = useToast();
  const [inviteLink, setInviteLink] = useState("");
  const router = useRouter();


  useEffect(() => {
    if (!user?.teamId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const teamDocRef = doc(db, 'teams', user.teamId);

    const unsubscribeTeam = onSnapshot(teamDocRef, async (teamDoc) => {
      if (!teamDoc.exists()) {
        setTeam(null);
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
      setTeam(teamData);

      const spocsQuery = query(collection(db, "users"), where("institute", "==", teamData.institute), where("role", "==", "spoc"), where("spocStatus", "==", "approved"));
      const spocSnapshot = await getDocs(spocsQuery);
      if (!spocSnapshot.empty) {
          setSpoc(spocSnapshot.docs[0].data() as UserProfile);
      } else {
          setSpoc(null);
      }

      const memberUIDs = teamData.members.map(m => m.uid).filter(Boolean);
      const allUIDs = [...new Set([teamData.leader.uid, ...memberUIDs])];
      
      const memberPromises = allUIDs.map(uid => getDoc(doc(db, 'users', uid)));
      
      try {
        const memberDocs = await Promise.all(memberPromises);
        const membersData = memberDocs
          .filter(doc => doc.exists())
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        
        setTeamMembers(membersData);
      } catch (error) {
         console.error("Error fetching all member data:", error);
         toast({ title: "Error", description: "Could not load all member details.", variant: "destructive" });
      } finally {
        setLoading(false);
      }

    }, (error) => {
      console.error("Error fetching team data:", error);
      toast({ title: "Error", description: "Failed to fetch team data.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribeTeam();
  }, [user?.teamId, toast]);
  
  const sortedTeamMembers = useMemo(() => {
    const leader = teamMembers.find(m => m.role === 'leader');
    const members = teamMembers.filter(m => m.role !== 'leader');
    
    if (sortConfig !== null) {
      members.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof UserProfile] ?? '';
        const bValue = b[sortConfig.key as keyof UserProfile] ?? '';
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
  
  const handleLeaveTeam = async () => {
    if (!user) return;
    setIsLeaving(true);
    try {
        const result = await leaveTeam({ userId: user.uid });
        if (result.success) {
            toast({ title: "Success", description: result.message });
            setTeam(null);
            setTeamMembers([]);
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({ title: "Error Leaving Team", description: error.message, variant: "destructive" });
    } finally {
        setIsLeaving(false);
    }
  }
  
  const handleJoinWithLink = () => {
    if (!inviteLink) {
        toast({ title: "Invalid Link", description: "Please paste a valid invitation link.", variant: "destructive" });
        return;
    }
    try {
        const url = new URL(inviteLink);
        const pathSegments = url.pathname.split('/');
        const token = pathSegments.pop() || pathSegments.pop(); // Handle optional trailing slash
        
        if (!token || pathSegments[pathSegments.length -1] !== 'join') {
            throw new Error("Link does not appear to be a valid invite link.");
        }

        router.push(`/join/${token}`);
    } catch (error) {
        toast({ title: "Invalid Link", description: "The provided URL is not valid. Please check and try again.", variant: "destructive"});
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
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Could not load user data. Please try again later.</AlertDescription>
            </Alert>
        </div>
    );
  }
  
  const teamValidation = {
    isRegistered: teamMembers.length === 6 && teamMembers.filter(m => m.gender === "F").length >= 1,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground">Here is your team and hackathon information.</p>
        </div>
         {team && (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status: </span>
                {teamValidation.isRegistered ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600">Registered</Badge>
                ) : (
                    <Badge variant="destructive">Registration Pending</Badge>
                )}
            </div>
        )}
      </header>
      
      {!user.teamId && (
        <div className="mb-8 space-y-8">
            <InvitationsSection />
             <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>You are not on a team yet.</AlertTitle>
                <AlertDescription>
                  Once your team leader invites you, you will see the invitation above. If you already have an invite link, you can paste it below to join.
                </AlertDescription>
              </Alert>
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LinkIcon/> Join with Invite Link</CardTitle>
                    <CardDescription>Paste the invitation link you received from your team leader here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="https://vadodarahackathon.pierc.org/join/..."
                            value={inviteLink}
                            onChange={(e) => setInviteLink(e.target.value)}
                        />
                        <Button onClick={handleJoinWithLink}>Join Team</Button>
                    </div>
                </CardContent>
              </Card>
        </div>
      )}
      
      {team ? (
        <div className="space-y-8">
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users/> Team Details: {team.name}
                {team.teamNumber && <Badge variant="secondary" className="ml-auto">{`Team No: ${team.teamNumber}`}</Badge>}
              </CardTitle>
              <CardDescription>Your current team roster from {team.institute}.</CardDescription>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTeamMembers.length > 0 ? (
                        sortedTeamMembers.map((member) => {
                           const isLeader = member.role === 'leader';
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
                              <Badge variant={isLeader ? 'default' : 'secondary'}>
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
                          </TableRow>
                           )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto"/> : 'No members found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

               {/* Mobile Card View */}
               <div className="md:hidden space-y-4">
                  {sortedTeamMembers.length > 0 ? (
                    sortedTeamMembers.map((member) => {
                      const isLeader = member.role === 'leader';
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
                        </Card>
                      )
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                       {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto"/> : 'No members found in your team yet.'}
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
          
          <div className="grid gap-8 lg:grid-cols-2">
            <AnnouncementsSection audience="spoc_teams" />
            <div className="space-y-8">
               <Card>
                    <CardHeader>
                        <CardTitle>Problem Statement & Category</CardTitle>
                        <CardDescription>This is the problem statement your team has selected.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {team.problemStatementId ? (
                            <div className="space-y-3">
                                <p className="text-muted-foreground">Your team has selected:</p>
                                <h3 className="text-lg font-semibold">{team.problemStatementTitle}</h3>
                                <p className="text-sm">Team Category: <span className="font-semibold">{team.category}</span></p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-start gap-4">
                                <Alert variant="default" className="border-primary/30">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Not Selected Yet</AlertTitle>
                                    <AlertDescription>
                                        Your team leader has not selected a problem statement yet.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </CardContent>
                </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText/> Institute SPOC Details</CardTitle>
                  <CardDescription>Your point of contact for any queries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {spoc ? (
                    <>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-primary"/>
                        <span className="font-medium">{spoc.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary"/>
                        <a href={`mailto:${spoc.email}`} className="text-muted-foreground hover:text-primary">{spoc.email}</a>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary"/>
                         <a href={`https://wa.me/+91${spoc.contactNumber}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            {spoc.contactNumber}
                        </a>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">SPOC details are not available yet. An SPOC for your institute will be assigned soon.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hackathon Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p><strong>Intra-Institute Round:</strong> 3rd, 4th & 5th September, 2025</p>
                      <p><strong>Grand Finale:</strong> 6th September, 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-primary"/>
                    <p>
                      <strong>Rewards:</strong>{" "}
                      <a href="https://vadodarahackathon.pierc.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Check the homepage for details.
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="mb-4">
                       If you leave the team, you will become a free agent. You can join another team if you are invited.
                    </CardDescription>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isLeaving}>
                                {isLeaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Leave Team
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to leave the team?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will remove you from the team "{team.name}". You will need a new invitation to rejoin this team or another team.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleLeaveTeam} className="bg-destructive hover:bg-destructive/90">
                                Yes, Leave Team
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

  

    