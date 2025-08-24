
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Phone, Mail, FileText, Trophy, Calendar, Loader2, AlertCircle, ArrowUpDown, CheckCircle } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { AnnouncementsSection } from "./announcements-section";
import { InvitationsSection } from "./invitations-section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import Link from "next/link";
import { Badge } from "./ui/badge";

type SortKey = 'name' | 'role' | 'email' | 'contactNumber' | 'enrollmentNumber' | 'yearOfStudy' | 'semester';
type SortDirection = 'asc' | 'desc';

export default function MemberDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [spoc, setSpoc] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>(null);

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
      
      const spocsQuery = query(collection(db, "users"), where("institute", "==", teamData.institute), where("role", "==", "spoc"), where("spocStatus", "==", "approved"));
      const unsubscribeSpoc = onSnapshot(spocsQuery, (snapshot) => {
          if (!snapshot.empty) {
              setSpoc(snapshot.docs[0].data() as UserProfile);
          } else {
              setSpoc(null);
          }
      });

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
        unsubscribeSpoc();
      };
    }, (error) => {
      console.error("Error fetching team data:", error);
      setLoading(false);
    });

    return unsubscribeTeam;

  }, [user?.teamId]);

  useEffect(() => {
    const unsubscribe = fetchTeamAndMembers();
    return () => unsubscribe();
  }, [fetchTeamAndMembers]);
  
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
    memberCount: {
        current: teamMembers.length,
        required: 6,
        isMet: teamMembers.length === 6,
    },
    femaleCount: {
        current: teamMembers.filter(m => m.gender === "F").length,
        required: 1,
        isMet: teamMembers.filter(m => m.gender === "F").length >= 1,
    },
    isRegistered: teamMembers.length === 6 && teamMembers.filter(m => m.gender === "F").length >= 1,
  }

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
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid grid-cols-1 gap-8">
             <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users/> Team Details: {team.name}
                        {team.teamNumber && <Badge variant="secondary" className="ml-auto">{`Team No: ${team.teamNumber}`}</Badge>}
                    </CardTitle>
                    <CardDescription>Your current team roster from {team.institute}.</CardDescription>
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
                                    </TableRow>
                                ))
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                                        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto"/> : 'No members found.'}
                                    </TableCell>
                                </TableRow>
                             )
                           }
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
             <AnnouncementsSection audience="teams_and_all" />
          </div>

          <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Team Status</CardTitle>
                    <CardDescription>Check if your team meets the hackathon requirements.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {teamValidation.isRegistered ? (
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
                            <AlertDescription>You have 6 members in your team. Great job!</AlertDescription>
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
