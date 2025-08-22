
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Team, TeamMember, UserProfile } from "@/lib/types";
import { AlertCircle, CheckCircle, PlusCircle, Trash2, User, Loader2, FileText, Pencil, Users2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayRemove, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { inviteMember } from "@/ai/flows/invite-member-flow";
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


export default function LeaderDashboard() {
  const { user, loading: authLoading, teamMembers } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (user?.teamId) {
        const teamDocRef = doc(db, "teams", user.teamId);
        const unsubscribe = onSnapshot(teamDocRef, (doc) => {
            if (doc.exists()) {
                setTeam({ id: doc.id, ...doc.data() } as Team);
            } else {
                setTeam(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching team:", error);
            toast({ title: "Error", description: "Could not fetch team data.", variant: "destructive" });
            setLoading(false);
        });
        return () => unsubscribe();
    } else {
        setLoading(false);
    }
  }, [user, authLoading, toast]);

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!team) return;
    setIsInviting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const memberEmail = formData.get("new-member-email") as string;
    
    // Check if member already exists by email
    const isAlreadyInTeam = team.members.some(m => m.email.toLowerCase() === memberEmail.toLowerCase()) || team.leader.email.toLowerCase() === memberEmail.toLowerCase();
    if (isAlreadyInTeam) {
        toast({ title: "Error", description: "This user is already in the team.", variant: "destructive" });
        setIsInviting(false);
        return;
    }

    try {
        const result = await inviteMember({
            teamId: team.id,
            teamName: team.name,
            memberEmail,
        });

        if (result.success) {
            toast({ 
                title: "Invitation Sent", 
                description: result.message,
                duration: 10000,
            });
            form.reset();
        } else {
             toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch (error) {
      console.error("Error adding member:", error);
      toast({ title: "Error", description: "Failed to add member.", variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

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

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
            <AnnouncementsSection audience="teams_and_all" />
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users2 />
                        Team Members ({teamMembers.length} / 6)
                    </CardTitle>
                    <CardDescription>Your current team roster.</CardDescription>
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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teamMembers.map((member) => (
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
        </div>
        
        {/* Right Column */}
        <div className="lg:col-span-1 space-y-8">
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
                    <CardTitle>Add New Member</CardTitle>
                    <CardDescription>
                        {canAddMoreMembers ? `You can invite ${6 - teamMembers.length} more members.` : "Your team is full."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {canAddMoreMembers ? (
                    <form onSubmit={handleAddMember} className="space-y-4">
                         <div>
                            <Label htmlFor="new-member-email">Member's Email</Label>
                            <Input id="new-member-email" name="new-member-email" type="email" placeholder="member@example.com" required disabled={isInviting}/>
                        </div>
                        <Button type="submit" disabled={isInviting}>
                            {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                             Send Invitation
                        </Button>
                    </form>
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
