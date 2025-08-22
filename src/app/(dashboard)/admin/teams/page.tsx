
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AllTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const teamsCollection = collection(db, 'teams');
    const unsubscribe = onSnapshot(teamsCollection, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teams:", error);
      toast({ title: "Error", description: "Failed to fetch teams.", variant: "destructive" });
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [toast]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">All Teams</h1>
        <p className="text-muted-foreground">View and manage all registered teams.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Registered Teams List</CardTitle>
          <CardDescription>
            {teams.length} team(s) registered across all institutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : teams.length > 0 ? (
            <ul className="space-y-3">
              {teams.map(team => (
                <li key={team.id} className="p-4 border rounded-md flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-lg">{team.name}</p>
                        <p className="text-sm text-muted-foreground">{team.institute}</p>
                        <p className="text-sm text-muted-foreground">Leader: {team.leader.name}</p>
                    </div>
                    <div className="text-right">
                         <p className="font-semibold">{team.members.length + 1} / 6 members</p>
                         <Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>{team.category}</Badge>
                    </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-4">No teams have registered yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
