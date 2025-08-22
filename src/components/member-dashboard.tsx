
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Phone, Mail, FileText, Trophy, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { AnnouncementsSection } from "./announcements-section";
import { InvitationsSection } from "./invitations-section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

export default function MemberDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [spoc, setSpoc] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeamMembers = useCallback((memberUIDs: string[]) => {
    const unsubscribers = memberUIDs.map(uid => {
      if (!uid) return () => {};
      const userDocRef = doc(db, 'users', uid);
      return onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const updatedMember = { uid: doc.id, ...doc.data() } as UserProfile;
          setTeamMembers(prevMembers => {
            const existingMemberIndex = prevMembers.findIndex(m => m.uid === updatedMember.uid);
            if (existingMemberIndex > -1) {
              const newMembers = [...prevMembers];
              newMembers[existingMemberIndex] = updatedMember;
              return newMembers;
            } else {
              return [...prevMembers, updatedMember];
            }
          });
        }
      });
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  useEffect(() => {
    let unsubscribeTeam: () => void = () => {};
    let unsubscribeSpoc: () => void = () => {};

    const fetchSpoc = (institute: string) => {
        const spocsQuery = query(collection(db, "users"), where("institute", "==", institute), where("role", "==", "spoc"), where("spocStatus", "==", "approved"));
        return onSnapshot(spocsQuery, (snapshot) => {
            if (!snapshot.empty) {
                setSpoc(snapshot.docs[0].data() as UserProfile);
            } else {
                setSpoc(null);
            }
        });
    };

    if (user && user.teamId) {
        const teamDocRef = doc(db, "teams", user.teamId);
        unsubscribeTeam = onSnapshot(teamDocRef, (teamDoc) => {
            if (teamDoc.exists()) {
                const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
                setTeam(teamData);

                const allMemberUIDs = [teamData.leader.uid, ...teamData.members.map(m => m.uid)];
                const uniqueUIDs = [...new Set(allMemberUIDs)];
                setTeamMembers([]);
                fetchTeamMembers(uniqueUIDs);
                
                if (teamData.institute) {
                    unsubscribeSpoc = fetchSpoc(teamData.institute);
                }
            } else {
                setTeam(null);
                setTeamMembers([]);
            }
             setLoading(false);
        }, (error) => {
            console.error("Error fetching team data:", error);
            setLoading(false);
        });
    } else {
        setLoading(false);
    }

    return () => {
        unsubscribeTeam();
        unsubscribeSpoc();
    };
  }, [user, fetchTeamMembers]);

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
  
  const sortedTeamMembers = [...teamMembers].sort((a, b) => {
      if (a.role === 'leader') return -1;
      if (b.role === 'leader') return 1;
      return a.name.localeCompare(b.name);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Welcome, {user.name}!</h1>
        <p className="text-muted-foreground">Here is your team and hackathon information.</p>
      </header>
      
      {!user.teamId && (
        <div className="mb-8">
            <InvitationsSection />
        </div>
      )}
      
      {team ? (
        <>
        <Card className="mb-8 w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users/> Team Details: {team.name}
                </CardTitle>
                <CardDescription>Your current team roster from {team.institute}.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Enrollment No.</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Sem</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTeamMembers.length > 0 ? (
                            sortedTeamMembers.map((member) => (
                                <TableRow key={member.uid}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 text-xs rounded-full ${member.role === 'leader' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                                            {member.role}
                                        </span>
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>{member.enrollmentNumber || 'N/A'}</TableCell>
                                    <TableCell>{member.yearOfStudy || 'N/A'}</TableCell>
                                    <TableCell>{member.semester || 'N/A'}</TableCell>
                                </TableRow>
                            ))
                         ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                    {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto"/> : 'No members found.'}
                                </TableCell>
                            </TableRow>
                         )
                       }
                    </TableBody>
                </Table>
            </CardContent>
         </Card>

        <div className="grid gap-8 lg:grid-cols-2">
            <AnnouncementsSection audience="teams_and_all" />
            <div className="space-y-8">
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
                                    <a href={`tel:${spoc.contactNumber}`} className="text-muted-foreground hover:text-primary">{spoc.contactNumber}</a>
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground">SPOC details are not available yet.</p>
                        )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Hackathon Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-primary"/>
                            <p><strong>Dates:</strong> To be Announced</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Trophy className="h-5 w-5 text-primary"/>
                            <p><strong>Rewards:</strong> Check the homepage for details.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </>
      ) : !user.teamId ? (
         <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>You are not on a team yet.</AlertTitle>
            <AlertDescription>
              Once your team leader invites you, you will see the invitation above. If you believe this is an error, please contact your team leader.
            </AlertDescription>
          </Alert>
      ) : null}
    </div>
  );
}
