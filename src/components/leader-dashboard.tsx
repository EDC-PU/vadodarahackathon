
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Team, TeamMember, UserProfile, ProblemStatement } from "@/lib/types";
import { AlertCircle, CheckCircle, PlusCircle, Trash2, User, Loader2, FileText, Pencil } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { inviteMember } from "@/ai/flows/invite-member-flow";
import { SelectProblemStatementDialog } from "./select-problem-statement-dialog";


export default function LeaderDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isSelectProblemStatementOpen, setIsSelectProblemStatementOpen] = useState(false);
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
            setLoading(false);
        });
        return () => unsubscribe();
    } else {
        setLoading(false);
    }
  }, [user, authLoading]);

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!team) return;
    setIsInviting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const memberEmail = formData.get("new-member-email") as string;
    const memberName = formData.get("new-member-name") as string;
    
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
            memberName,
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

  const handleRemoveMember = async (memberToRemove: TeamMember) => {
    if (!team) return;

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
    }
  };
  
  const handleProblemStatementSelect = async (ps: ProblemStatement) => {
    if (!team) return;
    try {
        const teamDocRef = doc(db, 'teams', team.id);
        await updateDoc(teamDocRef, {
            problemStatementId: ps.id,
            problemStatementTitle: ps.title,
        });
        toast({ title: "Success", description: "Problem statement selected." });
        setIsSelectProblemStatementOpen(false);
    } catch (error) {
        console.error("Error selecting problem statement:", error);
        toast({ title: "Error", description: "Could not select problem statement.", variant: "destructive" });
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
        current: 1 + team.members.length,
        required: 6,
        isMet: (1 + team.members.length) === 6,
    },
    femaleCount: {
        current: team.members.filter(m => m.gender === "Female").length + (user.gender === 'Female' ? 1: 0),
        required: 1,
        isMet: team.members.filter(m => m.gender === "Female").length + (user.gender === 'Female' ? 1: 0) >= 1,
    }
  }

  const canAddMoreMembers = team.members.length < 5;

  return (
    <>
    <SelectProblemStatementDialog 
        isOpen={isSelectProblemStatementOpen}
        onOpenChange={setIsSelectProblemStatementOpen}
        teamCategory={team.category}
        onProblemStatementSelect={handleProblemStatementSelect}
    />
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Team Dashboard: {team.name}</h1>
        <p className="text-muted-foreground">Manage your team and review your registration status.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
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
                    <CardTitle>Problem Statement</CardTitle>
                    <CardDescription>Select a problem statement for your team to work on.</CardDescription>
                </CardHeader>
                <CardContent>
                    {team.problemStatementId ? (
                        <div className="space-y-3">
                            <p className="text-muted-foreground">Your team has selected:</p>
                            <h3 className="text-lg font-semibold">{team.problemStatementTitle}</h3>
                             <Button variant="outline" onClick={() => setIsSelectProblemStatementOpen(true)}>
                                <Pencil className="mr-2 h-4 w-4" /> Change Problem Statement
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-start gap-4">
                            <p>Your team has not selected a problem statement yet.</p>
                            <Button onClick={() => setIsSelectProblemStatementOpen(true)}>
                                <FileText className="mr-2 h-4 w-4" /> Select Problem Statement
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Member</CardTitle>
                    <CardDescription>
                        {canAddMoreMembers ? `You can add ${5 - team.members.length} more members.` : "Your team is full."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {canAddMoreMembers ? (
                    <form onSubmit={handleAddMember} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="new-member-name">Full Name</Label>
                                <Input id="new-member-name" name="new-member-name" placeholder="Member's Name" required disabled={isInviting}/>
                            </div>
                            <div>
                                <Label htmlFor="new-member-email">Email</Label>
                                <Input id="new-member-email" name="new-member-email" type="email" placeholder="member@example.com" required disabled={isInviting}/>
                            </div>
                        </div>
                        <Button type="submit" disabled={isInviting}>
                            {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                             Invite Member
                        </Button>
                    </form>
                   ): (
                    <p className="text-sm text-muted-foreground">You have reached the maximum number of team members.</p>
                   )}
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Team Members ({1 + team.members.length} / 6)</CardTitle>
                    <CardDescription>Your current team roster.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-md">
                        <User className="h-6 w-6 text-primary"/>
                        <div>
                            <p className="font-semibold">{user.name} (Leader)</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    {team.members.map((member, index) => (
                        <div key={member.email || index} className="flex items-center gap-4 p-3 border rounded-md">
                            <User className="h-6 w-6 text-muted-foreground"/>
                            <div className="flex-1">
                                <p className="font-semibold">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(member)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>
                    ))}
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
    </>
  );
}
