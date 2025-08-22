"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMember } from "@/lib/types";
import { AlertCircle, CheckCircle, PlusCircle, Trash2, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


const currentMembers: TeamMember[] = [
    { uid: "1", name: "Anjali Sharma", email: "anjali@test.com", enrollmentNumber: "12345", contactNumber: "9876543210", gender: "Female" },
    { uid: "2", name: "Ravi Kumar", email: "ravi@test.com", enrollmentNumber: "12346", contactNumber: "9876543211", gender: "Male" },
];

const teamValidation = {
    memberCount: {
        current: 1 + currentMembers.length,
        required: 6,
        isMet: (1 + currentMembers.length) === 6,
    },
    femaleCount: {
        current: currentMembers.filter(m => m.gender === "Female").length,
        required: 1,
        isMet: currentMembers.filter(m => m.gender === "Female").length >= 1,
    }
}


export default function LeaderDashboard() {
  const canAddMoreMembers = currentMembers.length < 5;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Team Dashboard</h1>
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
                        {canAddMoreMembers ? `You can add ${5 - currentMembers.length} more members.` : "Your team is full."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {canAddMoreMembers ? (
                    <form className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="new-member-name">Full Name</Label>
                                <Input id="new-member-name" placeholder="Member's Name"/>
                            </div>
                            <div>
                                <Label htmlFor="new-member-email">Email</Label>
                                <Input id="new-member-email" type="email" placeholder="member@example.com"/>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="new-member-enrollment">Enrollment No.</Label>
                                <Input id="new-member-enrollment" placeholder="2003031XXXX" />
                            </div>
                            <div>
                                <Label htmlFor="new-member-contact">Contact Number</Label>
                                <Input id="new-member-contact" placeholder="9876543210"/>
                            </div>
                            <div>
                                <Label htmlFor="new-member-gender">Gender</Label>
                                <Select>
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
                            <p className="font-semibold">Your Name (Leader)</p>
                            <p className="text-sm text-muted-foreground">you@example.com</p>
                        </div>
                    </div>
                    {currentMembers.map(member => (
                        <div key={member.uid} className="flex items-center gap-4 p-3 border rounded-md">
                            <User className="h-6 w-6 text-muted-foreground"/>
                            <div className="flex-1">
                                <p className="font-semibold">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
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
