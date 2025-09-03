
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, PlusCircle, Users, ClipboardList, Trash2, Pencil, Download, Send } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, getDocs, orderBy } from "firebase/firestore";
import { JuryPanel, Team, ProblemStatement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AddJuryPanelDialog } from "@/components/add-jury-panel-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteJuryPanel } from "@/ai/flows/delete-jury-panel-flow";
import { EditJuryPanelDialog } from "@/components/edit-jury-panel-dialog";
import { exportEvaluation } from "@/ai/flows/export-evaluation-flow";
import { finalizeJuryPanel } from "@/ai/flows/finalize-jury-panel-flow";

export default function ManageJuryPage() {
  const [panels, setPanels] = useState<JuryPanel[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<JuryPanel | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const panelsQuery = query(collection(db, "juryPanels"), orderBy("createdAt", "desc"));
    const teamsQuery = query(collection(db, "teams"));
    const psQuery = query(collection(db, "problemStatements"));

    const unsubPanels = onSnapshot(panelsQuery, (snapshot) => {
      setPanels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JuryPanel)));
    }, (error) => {
      console.error("Error fetching jury panels:", error);
      toast({ title: "Error", description: "Could not load jury panels.", variant: "destructive" });
    });

    const unsubTeams = onSnapshot(teamsQuery, (snapshot) => {
        setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });

     const unsubPs = onSnapshot(psQuery, (snapshot) => {
        setProblemStatements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement)));
    });

    Promise.all([
        getDocs(panelsQuery),
        getDocs(teamsQuery),
        getDocs(psQuery),
    ]).then(() => setLoading(false));

    return () => {
        unsubPanels();
        unsubTeams();
        unsubPs();
    };
  }, [toast]);
  
  const teamsByPanel = useMemo(() => {
    const map = new Map<string, Team[]>();
    teams.forEach(team => {
        if(team.panelId) {
            const existing = map.get(team.panelId) || [];
            map.set(team.panelId, [...existing, team]);
        }
    });
    return map;
  }, [teams]);

  const handleEdit = (panel: JuryPanel) => {
    setSelectedPanel(panel);
    setIsEditPanelOpen(true);
  };

  const handleDelete = async (panelId: string) => {
    setIsProcessing(`delete-${panelId}`);
    try {
      const result = await deleteJuryPanel({ panelId });
      if(result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        throw new Error(result.message);
      }
    } catch(error: any) {
       toast({ title: "Error", description: `Failed to delete panel: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  }

  const handleFinalize = async (panelId: string) => {
    setIsProcessing(`finalize-${panelId}`);
    try {
      const result = await finalizeJuryPanel({ panelId });
      if (result.success) {
        toast({ title: "Success!", description: result.message, duration: 8000 });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
       toast({ title: "Error", description: `Failed to finalize panel: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };
  
  const handleExportEvaluation = async (panel: JuryPanel) => {
    setIsExporting(panel.id);
    try {
        const teamsForPanel = teamsByPanel.get(panel.id) || [];
        if (teamsForPanel.length === 0) {
            toast({ title: "No Teams", description: "This panel has no teams assigned to it.", variant: "destructive" });
            return;
        }

        const problemStatementsMap = new Map(problemStatements.map(ps => [ps.id, ps]));
        
        const teamsToExport = teamsForPanel.map(team => {
            const ps = team.problemStatementId ? problemStatementsMap.get(team.problemStatementId) : null;
            return {
              team_number: team.teamNumber || 'N/A',
              team_name: team.name,
              leader_name: team.leader.name,
              problemstatement_id: ps?.problemStatementId || 'N/A',
              problemstatement_title: team.problemStatementTitle || 'N/A',
            };
        });

        const result = await exportEvaluation({
            instituteName: `Jury_Panel_${panel.name.replace(/\s+/g, '_')}`,
            teams: teamsToExport
        });

        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || `${panel.name}_Evaluation.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            throw new Error(result.message || "Failed to export evaluation sheet.");
        }
    } catch (error: any) {
        toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsExporting(null);
    }
  };


  return (
    <>
      <AddJuryPanelDialog
        isOpen={isAddPanelOpen}
        onOpenChange={setIsAddPanelOpen}
        onPanelAdded={() => {
          /* onSnapshot handles UI update */
        }}
      />
      {selectedPanel && (
        <EditJuryPanelDialog
          isOpen={isEditPanelOpen}
          onOpenChange={setIsEditPanelOpen}
          panel={selectedPanel}
          onPanelUpdated={() => {
            /* onSnapshot handles UI update */
          }}
        />
      )}
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline">Manage Jury Panels</h1>
            <p className="text-muted-foreground">
              Create jury panels and assign them to teams for evaluation.
            </p>
          </div>
          <Button onClick={() => setIsAddPanelOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Panel
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>All Jury Panels</CardTitle>
            <CardDescription>
              {panels.length} panel(s) found. Expand a panel to see members and assigned teams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : panels.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {panels.map((panel) => {
                    const assignedTeams = teamsByPanel.get(panel.id) || [];
                    const isDraft = panel.status === 'draft';
                    return (
                        <AccordionItem value={panel.id} key={panel.id}>
                           <div className="flex items-center w-full py-4">
                                <AccordionTrigger className="flex-1 hover:no-underline p-0">
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg font-semibold">{panel.name}</span>
                                      {isDraft && <Badge variant="secondary">Draft</Badge>}
                                      <Badge variant="outline">{assignedTeams.length} Team(s) Assigned</Badge>
                                    </div>
                                </AccordionTrigger>
                                <div className="flex items-center gap-4 ml-4">
                                  {isDraft ? (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" disabled={isProcessing === `finalize-${panel.id}`}>
                                          {isProcessing === `finalize-${panel.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                                          <span className="ml-2 hidden sm:inline">Finalize Panel</span>
                                        </Button>
                                      </AlertDialogTrigger>
                                       <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Finalize this Panel?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will create user accounts for all jury members and email them their login credentials. This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleFinalize(panel.id)}>Yes, Finalize</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  ) : (
                                    <Button variant="outline" size="sm" disabled={isExporting === panel.id} onClick={() => handleExportEvaluation(panel)}>
                                      {isExporting === panel.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4" />}
                                      <span className="ml-2 hidden sm:inline">Download Sheet</span>
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(panel)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="icon" className="h-8 w-8" disabled={isProcessing === `delete-${panel.id}`}>
                                        {isProcessing === `delete-${panel.id}` ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This action will permanently delete the panel "{panel.name}" { !isDraft && "and delete all its jury member accounts."} This cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(panel.id)} className="bg-destructive hover:bg-destructive/90">Delete Panel</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                            </div>
                            <AccordionContent className="p-4 bg-secondary/30 rounded-md">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2"><Users/> Jury Members</h4>
                                        <ul className="space-y-2">
                                            {panel.members.map(member => (
                                                <li key={member.uid || member.email} className="text-sm">
                                                    <p className="font-medium">{member.name}</p>
                                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2"><ClipboardList /> Assigned Teams</h4>
                                        {assignedTeams.length > 0 ? (
                                             <ul className="space-y-1 text-sm">
                                                {assignedTeams.map(team => (
                                                    <li key={team.id}>{team.name}</li>
                                                ))}
                                             </ul>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No teams assigned to this panel yet. Assign teams from the "University Level Nominations" page.</p>
                                        )}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
              </Accordion>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No jury panels have been created yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
