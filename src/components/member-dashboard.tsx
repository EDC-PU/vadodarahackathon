"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Phone, Mail, FileText, Trophy, Calendar } from "lucide-react";

const teamDetails = {
    name: "Tech Titans",
    institute: "Parul University",
    department: "Computer Engineering",
    leader: { name: "Anjali Sharma", email: "anjali@test.com" },
    members: [
        { name: "Anjali Sharma (Leader)" },
        { name: "Ravi Kumar" },
        { name: "Sunita Williams" },
        { name: "Amit Patel" },
        { name: "Priya Singh" },
        { name: "Rohan Desai" },
    ]
}

const spocDetails = {
    name: "Dr. Prof. XYZ",
    email: "spoc@paruluniversity.ac.in",
    phone: "+91 9988776655",
}

export default function MemberDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Welcome, Team Member!</h1>
        <p className="text-muted-foreground">Here is your team and hackathon information.</p>
      </header>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users/> Team Details</CardTitle>
                <CardDescription>Your team, "{teamDetails.name}", from {teamDetails.institute}.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="font-semibold mb-2">Team Leader: {teamDetails.leader.name} ({teamDetails.leader.email})</p>
                <div className="space-y-2">
                    <p className="font-semibold">Members:</p>
                    <ul className="list-disc list-inside pl-2 text-muted-foreground space-y-1">
                        {teamDetails.members.map(m => <li key={m.name}>{m.name}</li>)}
                    </ul>
                </div>
            </CardContent>
        </Card>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText/> Institute SPOC Details</CardTitle>
                    <CardDescription>Your point of contact for any queries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-primary"/>
                        <span className="font-medium">{spocDetails.name}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary"/>
                        <a href={`mailto:${spocDetails.email}`} className="text-muted-foreground hover:text-primary">{spocDetails.email}</a>
                    </div>
                     <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary"/>
                         <a href={`tel:${spocDetails.phone}`} className="text-muted-foreground hover:text-primary">{spocDetails.phone}</a>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Hackathon Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary"/>
                        <p><strong>Dates:</strong> October 26th - 27th, 2024</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-primary"/>
                        <p><strong>Total Rewards:</strong> Prize pool of over ₹2,00,000</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
