
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Team } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileSignature, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { enrollTeamInSsih } from "@/ai/flows/enroll-team-in-ssih-flow";

export default function SsihEnrollmentPage() {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.institute) {
        setLoading(false);
        return;
    }
    setLoading(true);
    const teamsQuery = query(
        collection(db, "teams"), 
        where("institute", "==", user.institute),
        where("sihSelectionStatus", "==", "institute")
    );

    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teams for SIH enrollment:", error);
      toast({ title: "Error", description: "Could not fetch teams for SIH enrollment.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.institute, toast]);
  
  const handleEnroll = async (teamId: string) => {
    setIsSaving(teamId);
    try {
        const result = await enrollTeamInSsih({ teamId });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            throw new Error(result.message);
        }
    } catch(e: any) {
        console.error("Error enrolling team in SIH:", e);
        toast({ title: "Error", description: `Could not enroll team: ${e.message}`, variant: "destructive" });
    } finally {
        setIsSaving(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <FileSignature /> Smart India Hackathon (SIH) 2025 Enrollment
        </h1>
        <p className="text-muted-foreground">
          Enroll teams from your institute that were selected for institute-level SIH into the state-level hackathon.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Teams for SIH Enrollment</CardTitle>
          <CardDescription>
            These teams were nominated but not selected for the university-level SIH round and must be enrolled in SIH 2025.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || authLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : teams.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Teams Pending Enrollment</AlertTitle>
              <AlertDescription>
                There are currently no teams from your institute that need to be enrolled in SIH 2025.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Problem Statement</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.problemStatementTitle}</TableCell>
                      <TableCell>
                          <Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>
                              {team.category}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          {team.ssihEnrolled ? (
                            <div className="flex items-center justify-end gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-medium">Enrolled</span>
                            </div>
                          ) : (
                             <Button
                                size="sm"
                                onClick={() => handleEnroll(team.id)}
                                disabled={isSaving === team.id}
                             >
                                {isSaving === team.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Mark as Enrolled in SIH
                             </Button>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
