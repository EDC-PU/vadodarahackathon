
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Save, Medal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isAfter } from "date-fns";

export default function UniversityNominationsPage() {
  const [nominatedTeams, setNominatedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const canModify = isAfter(new Date(), new Date(2025, 7, 25)); // September 6th, 2025

  useEffect(() => {
    setLoading(true);
    const teamsQuery = query(collection(db, "teams"), where("isNominated", "==", true));

    const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setNominatedTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching nominated teams:", error);
      toast({ title: "Error", description: "Could not fetch nominated teams.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleStatusChange = async (teamId: string, status: 'university' | 'institute') => {
    setIsSaving(teamId);
    try {
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, { sihSelectionStatus: status });
      toast({ title: "Success", description: "Team status has been updated." });
    } catch (error) {
      console.error("Error updating team status:", error);
      toast({ title: "Error", description: "Could not update team status.", variant: "destructive" });
    } finally {
      setIsSaving(null);
    }
  };
  
  const getStatusVariant = (status?: string) => {
    if (status === 'university') return 'default';
    if (status === 'institute') return 'secondary';
    return 'outline';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Medal/> University Level Nominations</h1>
        <p className="text-muted-foreground">Manage teams nominated by institute SPOCs for the university-level round.</p>
      </header>

      {!canModify && (
        <Alert className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Selection Period Locked</AlertTitle>
            <AlertDescription>
                You can set the SIH selection status for these teams on or after September 6th, 2025.
            </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nominated Teams</CardTitle>
          <CardDescription>
            The following teams have been nominated by their respective institutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : nominatedTeams.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Nominated Teams</AlertTitle>
              <AlertDescription>
                There are currently no teams nominated by any institute SPOCs.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Institute</TableHead>
                    <TableHead>Problem Statement</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[300px]">SIH 2025 Selection Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nominatedTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.institute}</TableCell>
                      <TableCell>{team.problemStatementTitle}</TableCell>
                      <TableCell>
                          <Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>
                              {team.category}
                          </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Select
                             defaultValue={team.sihSelectionStatus}
                             onValueChange={(value) => handleStatusChange(team.id, value as 'university' | 'institute')}
                             disabled={!canModify || isSaving === team.id}
                           >
                              <SelectTrigger>
                                <SelectValue placeholder="Set Status..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="university">Selected for SIH (University Level)</SelectItem>
                                  <SelectItem value="institute">Selected for SIH (Institute Level)</SelectItem>
                              </SelectContent>
                           </Select>
                           {isSaving === team.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
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
