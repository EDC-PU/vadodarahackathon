
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Save, Medal, Download, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isAfter } from "date-fns";
import { exportEvaluation } from "@/ai/flows/export-evaluation-flow";
import { Input } from "@/components/ui/input";

export default function UniversityNominationsPage() {
  const [nominatedTeams, setNominatedTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [universityTeamIds, setUniversityTeamIds] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const canModify = isAfter(new Date(), new Date(2025, 8, 6)); // September 6th, 2025

  useEffect(() => {
    setLoading(true);
    const teamsQuery = query(collection(db, "teams"), where("isNominated", "==", true));

    const unsubscribe = onSnapshot(teamsQuery, async (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setNominatedTeams(teamsData);

      const currentIds: Record<string, string> = {};
      teamsData.forEach(team => {
        if(team.universityTeamId) {
            currentIds[team.id] = team.universityTeamId;
        }
      });
      setUniversityTeamIds(currentIds);

      const allUserIds = new Set<string>();
      teamsData.forEach(team => {
          allUserIds.add(team.leader.uid);
      });
      
      if (allUserIds.size > 0) {
        const usersQuery = query(collection(db, 'users'), where('uid', 'in', Array.from(allUserIds)));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = new Map<string, UserProfile>();
        usersSnapshot.forEach(doc => {
            usersData.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
        });
        setAllUsers(usersData);
      }

      setLoading(false);
    }, (error) => {
      console.error("Error fetching nominated teams:", error);
      toast({ title: "Error", description: "Could not fetch nominated teams.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleStatusChange = async (teamId: string, status: 'university' | 'institute') => {
    setIsSaving(`status-${teamId}`);
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

  const handleSaveUniversityId = async (teamId: string) => {
    const universityId = universityTeamIds[teamId];
    if (!universityId) {
      toast({ title: "Input Required", description: "Please enter a University Team ID.", variant: "destructive"});
      return;
    }
    setIsSaving(`id-${teamId}`);
    try {
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, { universityTeamId: universityId });
      toast({ title: "Success", description: "University Team ID has been saved." });
    } catch (error) {
      console.error("Error saving University Team ID:", error);
      toast({ title: "Error", description: "Could not save the ID.", variant: "destructive" });
    } finally {
      setIsSaving(null);
    }
  }
  
  const handleExport = async () => {
    if (nominatedTeams.length === 0) {
      toast({ title: "No Teams", description: "There are no nominated teams to export.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const problemStatementsSnapshot = await getDocs(collection(db, 'problemStatements'));
      const problemStatementsMap = new Map(problemStatementsSnapshot.docs.map(doc => [doc.id, doc.data() as any]));

      const teamsToExport = nominatedTeams.map(team => {
        const leader = allUsers.get(team.leader.uid);
        const ps = team.problemStatementId ? problemStatementsMap.get(team.problemStatementId) : null;
        return {
          team_number: team.teamNumber || 'N/A',
          team_name: team.name,
          leader_name: leader?.name || 'N/A',
          problemstatement_id: ps?.problemStatementId || 'N/A',
          problemstatement_title: team.problemStatementTitle || 'N/A',
        };
      });

      const result = await exportEvaluation({ instituteName: 'University_Level_Nominations', teams: teamsToExport });
      
      if (result.success && result.fileContent) {
        const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName || 'university-evaluation.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast({ title: "Success", description: "Evaluation sheet exported." });
      } else {
        throw new Error(result.message || "Failed to export.");
      }
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusVariant = (status?: string) => {
    if (status === 'university') return 'default';
    if (status === 'institute') return 'secondary';
    return 'outline';
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Medal/> University Level Nominations</h1>
          <p className="text-muted-foreground">Manage teams nominated by institute SPOCs for the university-level round.</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
          Export for Evaluation
        </Button>
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
                    <TableHead className="w-[200px]">University Team ID</TableHead>
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
                           <KeyRound className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={universityTeamIds[team.id] || ''}
                              onChange={(e) => setUniversityTeamIds(prev => ({...prev, [team.id]: e.target.value}))}
                              placeholder="e.g., PU-123"
                              className="h-9 w-32"
                            />
                            <Button size="sm" onClick={() => handleSaveUniversityId(team.id)} disabled={isSaving === `id-${team.id}`}>
                                {isSaving === `id-${team.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                            </Button>
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Select
                             defaultValue={team.sihSelectionStatus}
                             onValueChange={(value) => handleStatusChange(team.id, value as 'university' | 'institute')}
                             disabled={!canModify || isSaving === `status-${team.id}`}
                           >
                              <SelectTrigger>
                                <SelectValue placeholder="Set Status..." />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="university">Selected for SIH (University Level)</SelectItem>
                                  <SelectItem value="institute">Selected for SIH (Institute Level)</SelectItem>
                              </SelectContent>
                           </Select>
                           {isSaving === `status-${team.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
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
