"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Team, TeamMember, UserProfile } from "@/lib/types";
import { AlertCircle, CheckCircle, PlusCircle, Trash2, User, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function LeaderDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);
          if (userData.teamId) {
            const teamDocRef = doc(db, "teams", userData.teamId);
            const unsubscribeSnapshot = onSnapshot(teamDocRef, (doc) => {
              if (doc.exists()) {
                setTeam({ id: doc.id, ...doc.data() } as Team);
              } else {
                setTeam(null);
              }
              setLoading(false);
            });
            return () => unsubscribeSnapshot();
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleAddMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!team) return;

    const formData = new FormData(event.currentTarget);
    const newMember: TeamMember = {
      uid: Math.random().toString(36).substring(2), // temporary UID
      name: formData.get("new-member-name") as string,
      email: formData.get("new-member-email") as string,
      enrollmentNumber: formData.get("new-member-enrollment") as string,
      contactNumber: formData.get("new-member-contact") as string,
      gender: formData.get("new-member-gender") as "Male" | "Female" | "Other",
    };

    try {
      const teamDocRef = doc(db, "teams", team.id);
      await updateDoc(teamDocRef, {
        members: arrayUnion(newMember)
      });
      toast({ title: "Success", description: "Team member added." });
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error adding member:", error);
      toast({ title: "Error", description: "Failed to add member.", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (memberToRemove: TeamMember) => {
    if (!team) return;
    try {
        const teamDocRef = doc(db, "teams", team.id);
        await updateDoc(teamDocRef, {
            members: arrayRemove(memberToRemove)
        });
        toast({ title: "Success", description: "Team member removed." });
    } catch (error) {
        console.error("Error removing member:", error);
        toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    }
  };
  
  if (loading) {
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
          <AlertDescription>Could not load your team data. Please try again later.</AlertDescription>
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
                                <Input id="new-member-name" name="new-member-name" placeholder="Member's Name" required/>
                            </div>
                            <div>
                                <Label htmlFor="new-member-email">Email</Label>
                                <Input id="new-member-email" name="new-member-email" type="email" placeholder="member@example.com" required/>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="new-member-enrollment">Enrollment No.</Label>
                                <Input id="new-member-enrollment" name="new-member-enrollment" placeholder="2003031XXXX" required/>
                            </div>
                            <div>
                                <Label htmlFor="new-member-contact">Contact Number</Label>
                                <Input id="new-member-contact" name="new-member-contact" placeholder="9876543210" required/>
                            </div>
                            <div>
                                <Label htmlFor="new-member-gender">Gender</Label>
                                <Select name="new-member-gender" required>
                                    <SelectTrigger id="new-member-gender">
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button type="submit"><PlusCircle className="mr-2 h-4 w-4" /> Add Member</Button>
                    </form>
                   ): (
                    <p className="text-sm text-muted-foreground">You cannot add more members.</p>
                   )}
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
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
                    {team.members.map(member => (
                        <div key={member.uid} className="flex items-center gap-4 p-3 border rounded-md">
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
  );
}
