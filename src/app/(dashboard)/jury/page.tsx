
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { Team, UserProfile, JuryPanel, ProblemStatement } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, ClipboardList, UserCircle, Download, Briefcase, GraduationCap, Phone, Building, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { exportEvaluation } from "@/ai/flows/export-evaluation-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function JuryDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [assignedTeams, setAssignedTeams] = useState<Team[]>([]);
    const [teamLeaders, setTeamLeaders] = useState<Map<string, UserProfile>>(new Map());
    const [panel, setPanel] = useState<JuryPanel | null>(null);
    const [panelMembers, setPanelMembers] = useState<UserProfile[]>([]);
    const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Set the reveal time in UTC: September 13, 2025, 9:00 AM IST is 3:30 AM UTC
    const revealDate = new Date(Date.UTC(2025, 8, 13, 3, 30, 0)); 
    const [isTimeToShow, setIsTimeToShow] = useState(false);

    useEffect(() => {
      // This will run on the client, so it uses the client's clock
      setIsTimeToShow(new Date() >= revealDate);
    }, [revealDate]);

    useEffect(() => {
        if (!user || authLoading) return;
        if (!user.panelId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubscribes: (() => void)[] = [];

        // 1. Fetch Panel Details
        const panelDocRef = doc(db, 'juryPanels', user.panelId);
        const unsubPanel = onSnapshot(panelDocRef, async (panelDoc) => {
            if (panelDoc.exists()) {
                const panelData = { id: panelDoc.id, ...panelDoc.data() } as JuryPanel;
                setPanel(panelData);

                const memberUids = panelData.members.map(m => m.uid).filter(Boolean);
                if (memberUids.length > 0) {
                    const membersQuery = query(collection(db, 'users'), where('uid', 'in', memberUids));
                    const memberDocs = await getDocs(membersQuery);
                    setPanelMembers(memberDocs.docs.map(d => d.data() as UserProfile));
                }
                 
                const teamsQuery = query(collection(db, 'teams'), where('panelId', '==', user.panelId));
                const unsubTeams = onSnapshot(teamsQuery, async (snapshot) => {
                    const teamsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
                    setAssignedTeams(teamsData);

                    // Fetch leader profiles for these teams
                    const leaderUids = teamsData.map(t => t.leader.uid);
                    if (leaderUids.length > 0) {
                      const leadersQuery = query(collection(db, 'users'), where('uid', 'in', leaderUids));
                      const leaderDocs = await getDocs(leadersQuery);
                      const leaderMap = new Map<string, UserProfile>();
                      leaderDocs.forEach(d => leaderMap.set(d.id, d.data() as UserProfile));
                      setTeamLeaders(leaderMap);
                    }

                    setLoading(false);
                }, (err) => {
                    console.error("Error fetching teams for jury:", err);
                    setLoading(false);
                });
                unsubscribes.push(unsubTeams);

            } else {
                setPanel(null);
                setPanelMembers([]);
                setAssignedTeams([]);
                setLoading(false);
            }
        }, (err) => {
            console.error("Error fetching jury panel:", err);
            setLoading(false);
        });
        unsubscribes.push(unsubPanel);
        
        const psQuery = query(collection(db, "problemStatements"));
        const unsubPs = onSnapshot(psQuery, (snapshot) => {
          setProblemStatements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProblemStatement)));
        });
        unsubscribes.push(unsubPs);


        return () => {
            unsubscribes.forEach(unsub => unsub());
        };

    }, [user, authLoading]);
    
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline">Jury Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user?.name}. Here are your assigned teams for evaluation.</p>
            </header>

            <div className="flex flex-col gap-8">
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                        <CardTitle className="flex items-center gap-2"><ClipboardList /> Assigned Teams for Evaluation</CardTitle>
                        <CardDescription>Review the details of the teams you are assigned to evaluate.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                       {isTimeToShow ? (
                         <ScrollArea className="h-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Team Name</TableHead>
                                        <TableHead>Leader</TableHead>
                                        <TableHead>Year of Study</TableHead>
                                        <TableHead>Problem Statement</TableHead>
                                        <TableHead>Category</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignedTeams.length > 0 ? (
                                        assignedTeams.map(team => {
                                            const leader = teamLeaders.get(team.leader.uid);
                                            return (
                                            <TableRow key={team.id}>
                                                <TableCell className="font-medium">{team.name}</TableCell>
                                                <TableCell>{leader?.name || 'N/A'}</TableCell>
                                                <TableCell>{leader?.yearOfStudy || 'N/A'}</TableCell>
                                                <TableCell>{team.problemStatementTitle}</TableCell>
                                                <TableCell><Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>{team.category}</Badge></TableCell>
                                            </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                You have not been assigned any teams for evaluation yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                       ) : (
                         <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Teams are not yet visible</AlertTitle>
                            <AlertDescription>
                                Assigned teams will be visible for evaluation on September 13th, 2025, from 9:00 AM IST onwards.
                            </AlertDescription>
                        </Alert>
                       )}
                    </CardContent>
                </Card>

                {panel && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users /> Your Jury Panel: {panel.name}</CardTitle>
                            <CardDescription>These are the members of your evaluation panel.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {panelMembers.map(member => (
                                <div key={member.uid} className="p-3 border rounded-md bg-secondary/30">
                                    <p className="font-semibold flex items-center gap-2">
                                        <UserCircle className="h-4 w-4"/> {member.name} {member.uid === user?.uid && <span className="text-xs text-primary font-normal">(You)</span>}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{member.email}</p>
                                        <div className="mt-2 text-xs space-y-1 text-muted-foreground">
                                        <p className="flex items-center gap-1.5"><Building className="h-3 w-3" /> {member.institute}</p>
                                        <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {member.contactNumber || 'N/A'}</p>
                                        <p className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {member.department || 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                 {panel?.studentCoordinatorName && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserCircle /> Student Coordinator</CardTitle>
                            <CardDescription>Your point of contact for assistance.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="font-semibold text-lg">{panel.studentCoordinatorName}</p>
                            {panel.studentCoordinatorContact && (
                                <a href={`https://wa.me/91${panel.studentCoordinatorContact.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                                    <Phone className="h-4 w-4" />
                                    {panel.studentCoordinatorContact}
                                </a>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
