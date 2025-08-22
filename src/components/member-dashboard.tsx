"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Phone, Mail, FileText, Trophy, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Team, UserProfile, Spoc } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export default function MemberDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [spoc, setSpoc] = useState<Spoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);

          if (userData.teamId) {
            const teamDocRef = doc(db, "teams", userData.teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
              setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);

              // Assuming SPOC is assigned per institute and their data is in a 'spocs' collection
              // This is a simplification. A real app might have a more complex lookup.
              const spocQuery = doc(db, "spocs", teamDoc.data().institute); // Just an example
              const spocDoc = await getDoc(spocQuery);
              if (spocDoc.exists()) {
                setSpoc(spocDoc.data() as Spoc);
              }
            }
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
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
                <AlertDescription>Could not load your data. You may not be part of a team.</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Welcome, {user.name}!</h1>
        <p className="text-muted-foreground">Here is your team and hackathon information.</p>
      </header>
      
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users/> Team Details</CardTitle>
                <CardDescription>Your team, "{team.name}", from {team.institute}.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="font-semibold mb-2">Team Leader: {team.leader.name} ({team.leader.email})</p>
                <div className="space-y-2">
                    <p className="font-semibold">Members:</p>
                    <ul className="list-disc list-inside pl-2 text-muted-foreground space-y-1">
                        <li>{team.leader.name} (Leader)</li>
                        {team.members.map(m => <li key={m.uid}>{m.name}</li>)}
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
                                <a href={`tel:${spoc.phone}`} className="text-muted-foreground hover:text-primary">{spoc.phone}</a>
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
                    {/* This can be fetched from a 'config' document in Firestore */}
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
    </div>
  );
}
