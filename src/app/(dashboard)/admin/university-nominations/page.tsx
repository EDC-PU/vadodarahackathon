

"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { Team, UserProfile, JuryPanel, ProblemStatement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Save, Medal, Download, KeyRound, Mail, Copy, ChevronDown, ArrowUpDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isAfter } from "date-fns";
import { exportEvaluation } from "@/ai/flows/export-evaluation-flow";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { generateBulkNomination } from "@/ai/flows/generate-bulk-nomination-flow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea";
import { exportTeamsByIds } from "@/ai/flows/export-teams-by-ids-flow";

async function getUserProfilesInChunks(userIds: string[]): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();
    if (userIds.length === 0) return userProfiles;

    const chunkSize = 30;
    for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        if (chunk.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                userProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
            });
        }
    }
    return userProfiles;
}

export default function UniversityNominationsPage() {
  const [nominatedTeams, setNominatedTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<Map<string, UserProfile>>(new Map());
  const [juryPanels, setJuryPanels] = useState<JuryPanel[]>([]);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingTeams, setIsExportingTeams] = useState(false);
  const [isBulkNominating, setIsBulkNominating] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [universityTeamIds, setUniversityTeamIds] = useState<Record<string, string>>({});
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showSihStatus, setShowSihStatus] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { toast } = useToast();

  const canModify = isAfter(new Date(), new Date(2025, 8, 6)); // September 6th, 2025

  useEffect(() => {
    setLoading(true);
    const teamsQuery = query(collection(db, "teams"), where("isNominated", "==", true));
    const panelsQuery = query(collection(db, "juryPanels"), where("status", "==", "active"));
    const psQuery = query(collection(db, "problemStatements"));
    
    const unsubPanels = onSnapshot(panelsQuery, (snapshot) => {
        setJuryPanels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JuryPanel)));
    });

    const unsubPs = onSnapshot(psQuery, (snapshot) => {
      setProblemStatements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement)));
    });

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
        const usersData = await getUserProfilesInChunks(Array.from(allUserIds));
        setAllUsers(usersData);
      }

      setLoading(false);
    }, (error) => {
      console.error("Error fetching nominated teams:", error);
      toast({ title: "Error", description: "Could not fetch nominated teams.", variant: "destructive" });
      setLoading(false);
    });

    return () => {
        unsubscribe();
        unsubPanels();
        unsubPs();
    };
  }, [toast]);
  
  const handlePanelAssignment = async (teamId: string, panelId: string) => {
    setIsSaving(`panel-${teamId}`);
    try {
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, { panelId: panelId });
        toast({title: "Success", description: "Team assigned to panel."});
    } catch(error: any) {
        console.error("Error assigning panel:", error);
        toast({title: "Error", description: "Could not assign team to panel.", variant: "destructive"});
    } finally {
        setIsSaving(null);
    }
  }

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
  
  const handleExportEvaluation = async () => {
    if (nominatedTeams.length === 0) {
      toast({ title: "No Teams", description: "There are no nominated teams to export.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const problemStatementsMap = new Map(problemStatements.map(ps => [ps.id, ps]));

      const teamsToExport = nominatedTeams.map(team => {
        const leader = allUsers.get(team.leader.uid);
        const ps = team.problemStatementId ? problemStatementsMap.get(team.problemStatementId) : null;
        return {
          universityTeamId: team.universityTeamId || 'N/A',
          team_name: team.name,
          leader_name: leader?.name || 'N/A',
          problemstatement_id: ps?.problemStatementId || 'N/A',
          problemstatement_title: team.problemStatementTitle || 'N/A',
          category: team.category || 'N/A',
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

  const handleExportTeams = async () => {
    setIsExportingTeams(true);
    try {
        const teamIds = nominatedTeams.map(t => t.id);
        if (teamIds.length === 0) {
            toast({ title: "No Teams", description: "There are no nominated teams to export.", variant: "destructive" });
            return;
        }

        const result = await exportTeamsByIds({ teamIds });
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'nominated-teams.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "Nominated teams data has been exported." });
        } else {
            toast({ title: "Export Failed", description: result.message || "Could not generate the export file.", variant: "destructive" });
        }
    } catch (error: any) {
        console.error("Error exporting data:", error);
        toast({ title: "Error", description: "An unexpected error occurred during export.", variant: "destructive" });
    } finally {
        setIsExportingTeams(false);
    }
  };

  const handleBulkGenerateNomination = async () => {
    if (selectedTeamIds.length === 0) {
      toast({
            title: "No Teams Selected",
            description: "Please select at least one team to download nomination forms.",
            variant: "destructive"
        });
      return;
    }

    setIsBulkNominating(true);
    try {
        const result = await generateBulkNomination({ teamIds: selectedTeamIds, generatorRole: 'admin' });
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'nomination-forms.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: `${result.message} Included ${selectedTeamIds.length} nominated team(s).` });
            setSelectedTeamIds([]);
        } else {
            toast({ title: "Generation Failed", description: result.message || "Could not generate the zip file.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error generating bulk nomination forms:", error);
        toast({ title: "Error", description: "An unexpected error occurred during bulk generation.", variant: "destructive" });
    } finally {
        setIsBulkNominating(false);
    }
  };
  
  const allLeaderEmails = nominatedTeams.map(team => allUsers.get(team.leader.uid)?.email).filter(Boolean).join(', ');

  const getStatusVariant = (status?: string) => {
    if (status === 'university') return 'default';
    if (status === 'institute') return 'secondary';
    return 'outline';
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedTeamIds(nominatedTeams.map(t => t.id));
    } else {
        setSelectedTeamIds([]);
    }
  };

  const handleRowSelect = (teamId: string, checked: boolean) => {
    if (checked) {
        setSelectedTeamIds(prev => [...prev, teamId]);
    } else {
        setSelectedTeamIds(prev => prev.filter(id => id !== teamId));
    }
  };
  
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const filteredAndSortedTeams = useMemo(() => {
    let sortableTeams = [...nominatedTeams];

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      sortableTeams = sortableTeams.filter(team => {
        const leader = allUsers.get(team.leader.uid);
        const ps = team.problemStatementId ? problemStatements.find(p => p.id === team.problemStatementId) : null;
        return (
          team.name.toLowerCase().includes(lowercasedTerm) ||
          (leader && leader.email.toLowerCase().includes(lowercasedTerm)) ||
          team.institute.toLowerCase().includes(lowercasedTerm) ||
          (ps && ps.title.toLowerCase().includes(lowercasedTerm))
        );
      });
    }

    if (sortConfig !== null) {
      sortableTeams.sort((a, b) => {
        let aVal: string | undefined;
        let bVal: string | undefined;

        if (sortConfig.key === 'problemStatementId') {
          const psA = a.problemStatementId ? problemStatements.find(p => p.id === a.problemStatementId) : null;
          const psB = b.problemStatementId ? problemStatements.find(p => p.id === b.problemStatementId) : null;
          aVal = psA?.problemStatementId;
          bVal = psB?.problemStatementId;
        } else {
          aVal = (a as any)[sortConfig.key];
          bVal = (b as any)[sortConfig.key];
        }

        if (aVal! < bVal!) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal! > bVal!) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTeams;
  }, [nominatedTeams, searchTerm, sortConfig, allUsers, problemStatements]);


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Medal/> University Level Nominations</h1>
          <p className="text-muted-foreground">Manage teams nominated by institute SPOCs for the university-level round.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            {selectedTeamIds.length > 0 && (
                <Button variant="outline" onClick={handleBulkGenerateNomination} disabled={isBulkNominating}>
                    {isBulkNominating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download Forms ({selectedTeamIds.length})
                </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline"><Mail className="mr-2 h-4 w-4" /> Copy Leader Emails</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Leader Email Addresses</DialogTitle>
                  <DialogDescription>
                    Here is a list of all leader emails for the nominated teams.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  readOnly
                  value={allLeaderEmails}
                  rows={10}
                  className="font-mono text-xs"
                />
                <DialogFooter>
                  <Button onClick={() => {
                    navigator.clipboard.writeText(allLeaderEmails);
                    toast({ title: "Copied!", description: "All leader emails have been copied to your clipboard." });
                  }}>
                    <Copy className="mr-2 h-4 w-4" /> Copy to Clipboard
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleExportTeams} disabled={isExportingTeams}>
                {isExportingTeams ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Team Data
            </Button>
            <Button onClick={handleExportEvaluation} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
              Export for Evaluation
            </Button>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  View
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showAssignPanel}
                  onCheckedChange={setShowAssignPanel}
                >
                  Assign Panel
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showSihStatus}
                  onCheckedChange={setShowSihStatus}
                >
                  SIH Status
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
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
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                 <CardTitle className="flex items-center gap-2">
                    Nominated Teams
                    <Badge variant="secondary">{nominatedTeams.length} nominations received</Badge>
                </CardTitle>
                <CardDescription>
                    The following teams have been nominated by their respective institutes.
                </CardDescription>
              </div>
              <Input
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAndSortedTeams.length === 0 ? (
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
                     <TableHead className="w-[50px]">
                        <Checkbox
                           onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                           checked={selectedTeamIds.length === nominatedTeams.length && nominatedTeams.length > 0}
                           aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('name')}>
                            Team Name {getSortIndicator('name')}
                        </Button>
                    </TableHead>
                    <TableHead>Leader Email</TableHead>
                    <TableHead>
                         <Button variant="ghost" onClick={() => requestSort('institute')}>
                            Institute {getSortIndicator('institute')}
                        </Button>
                    </TableHead>
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('problemStatementId')}>
                            Problem Statement {getSortIndicator('problemStatementId')}
                        </Button>
                    </TableHead>
                    <TableHead>Category</TableHead>
                    {showAssignPanel && <TableHead>Assign Panel</TableHead>}
                    {showSihStatus && <TableHead className="w-[300px]">SIH 2025 Selection Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTeams.map((team) => {
                    const leader = allUsers.get(team.leader.uid);
                    const ps = team.problemStatementId ? problemStatements.find(p => p.id === team.problemStatementId) : null;
                    return (
                    <TableRow key={team.id} data-state={selectedTeamIds.includes(team.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedTeamIds.includes(team.id)}
                                onCheckedChange={(checked) => handleRowSelect(team.id, !!checked)}
                                aria-label={`Select team ${team.name}`}
                            />
                        </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-2 items-start">
                          <span>{team.name}</span>
                          <div className="flex items-center gap-2">
                           <KeyRound className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={universityTeamIds[team.id] || ''}
                              onChange={(e) => setUniversityTeamIds(prev => ({...prev, [team.id]: e.target.value}))}
                              placeholder="e.g., PU-123"
                              className="h-8 w-32"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); handleSaveUniversityId(team.id)}} disabled={isSaving === `id-${team.id}`}>
                                {isSaving === `id-${team.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                            </Button>
                         </div>
                        </div>
                      </TableCell>
                      <TableCell>{leader?.email || 'N/A'}</TableCell>
                      <TableCell>{team.institute}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal">
                          {ps ? `${ps.problemStatementId}: ${ps.title}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>{team.category || 'N/A'}</Badge>
                      </TableCell>
                      {showAssignPanel && (
                        <TableCell>
                            <Select
                              value={team.panelId || ""}
                              onValueChange={(panelId) => handlePanelAssignment(team.id, panelId)}
                              disabled={isSaving === `panel-${team.id}`}
                            >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Assign a Panel..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {juryPanels.map(panel => (
                                        <SelectItem key={panel.id} value={panel.id}>{panel.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </TableCell>
                      )}
                      {showSihStatus && (
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
                      )}
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

