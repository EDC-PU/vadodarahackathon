
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { Team, UserProfile, JuryPanel } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, ClipboardList, UserCircle } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function JuryDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [assignedTeams, setAssignedTeams] = useState<Team[]>([]);
    const [panel, setPanel] = useState<JuryPanel | null>(null);
    const [panelMembers, setPanelMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !user.panelId) {
            if (!authLoading) setLoading(false);
            return;
        }

        setLoading(true);

        // 1. Fetch Panel Details
        const panelDocRef = doc(db, 'juryPanels', user.panelId);
        const unsubscribePanel = onSnapshot(panelDocRef, async (panelDoc) => {
            if (panelDoc.exists()) {
                const panelData = { id: panelDoc.id, ...panelDoc.data() } as JuryPanel;
                setPanel(panelData);

                // Fetch full profiles for panel members
                const memberUids = panelData.members.map(m => m.uid);
                if (memberUids.length > 0) {
                    const membersQuery = query(collection(db, 'users'), where('uid', 'in', memberUids));
                    const memberDocs = await getDocs(membersQuery);
                    setPanelMembers(memberDocs.docs.map(d => d.data() as UserProfile));
                }
                 // 2. Fetch Assigned Teams after panel is loaded
                const teamsQuery = query(collection(db, 'teams'), where('panelId', '==', user.panelId));
                const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
                    const teamsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
                    setAssignedTeams(teamsData);
                    setLoading(false); // Set loading false only after teams are also loaded
                });
                return () => unsubscribeTeams(); // Nested unsubscribe

            } else {
                setPanel(null);
                setPanelMembers([]);
                setAssignedTeams([]);
                setLoading(false);
            }
        });

        return () => {
            unsubscribePanel();
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ClipboardList /> Assigned Teams for Evaluation</CardTitle>
                            <CardDescription>Review the details of the teams you are assigned to evaluate.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[60vh] border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Team Name</TableHead>
                                            <TableHead>Institute</TableHead>
                                            <TableHead>Problem Statement</TableHead>
                                            <TableHead>Category</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assignedTeams.length > 0 ? (
                                            assignedTeams.map(team => (
                                                <TableRow key={team.id}>
                                                    <TableCell className="font-medium">{team.name}</TableCell>
                                                    <TableCell>{team.institute}</TableCell>
                                                    <TableCell>{team.problemStatementTitle}</TableCell>
                                                    <TableCell><Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>{team.category}</Badge></TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">
                                                    You have not been assigned any teams for evaluation yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
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
                                        <p className="text-sm text-muted-foreground">{member.institute}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
