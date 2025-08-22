
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Phone, Mail, FileText, Trophy, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { Team, UserProfile, Spoc } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { AnnouncementsSection } from "./announcements-section";

export default function MemberDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [spoc, setSpoc] = useState<Spoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeTeam: () => void = () => {};
    
    const fetchSpoc = async (institute: string) => {
        // Simplified: Assuming one SPOC per institute, stored in 'users' with role 'spoc'
        const spocsQuery = query(collection(db, "users"), where("institute", "==", institute), where("role", "==", "spoc"));
        const spocSnapshot = await getDoc(spocsQuery.docs[0].ref); // Get first one
        if (spocSnapshot.exists()) {
             setSpoc(spocSnapshot.data() as Spoc);
        }
    };

    if (user && user.teamId) {
        const teamDocRef = doc(db, "teams", user.teamId);
        unsubscribeTeam = onSnapshot(teamDocRef, (teamDoc) => {
            if (teamDoc.exists()) {
                const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
                setTeam(teamData);
                if (teamData.institute) {
                    fetchSpoc(teamData.institute);
                }
            } else {
                // Team document was deleted
                setTeam(null);
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
    };
  }, [user]);
  
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
                <AlertTitle>No Team Found</AlertTitle>
                <AlertDescription>You are not currently part of a team. If you believe this is an error, please contact your team leader.</AlertDescription>
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
      
      <div className="mb-8">
        <AnnouncementsSection />
      </div>

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

    
