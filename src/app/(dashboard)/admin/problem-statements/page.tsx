
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Users, Pencil, Trash2, Upload } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { ProblemStatement, Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AddProblemStatementDialog } from "@/components/add-problem-statement-dialog";
import { EditProblemStatementDialog } from "@/components/edit-problem-statement-dialog";
import { BulkUploadPreviewDialog } from "@/components/bulk-upload-preview-dialog";
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
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { bulkUploadProblemStatements } from "@/ai/flows/bulk-upload-ps-flow";
import ExcelJS from 'exceljs';

export default function ProblemStatementsPage() {
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<ProblemStatement | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fileToUpload, setFileToUpload] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Fetch Problem Statements
    const problemStatementsCollection = collection(db, 'problemStatements');
    const q = query(problemStatementsCollection, orderBy("problemStatementId"));
    const unsubscribeStatements = onSnapshot(q, (snapshot) => {
        const statementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
        setProblemStatements(statementsData);
    }, (error) => {
        console.error("Error fetching problem statements:", error);
        toast({ title: "Error", description: "Failed to fetch problem statements.", variant: "destructive" });
    });

    // Fetch Teams
    const teamsCollection = collection(db, 'teams');
    const unsubscribeTeams = onSnapshot(teamsCollection, (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsData);
    }, (error) => {
        console.error("Error fetching teams:", error);
        toast({ title: "Error", description: "Failed to fetch teams data.", variant: "destructive" });
    });
    
    Promise.all([new Promise(res => onSnapshot(q, () => res(true))), new Promise(res => onSnapshot(teamsCollection, () => res(true)))]).then(() => {
        setLoading(false);
    });

    return () => {
      unsubscribeStatements();
      unsubscribeTeams();
    };
  }, [toast]);

  const getTeamCountForStatement = (statementId: string) => {
    return teams.filter(team => team.problemStatementId === statementId).length;
  };
  
  const handleEditClick = (ps: ProblemStatement) => {
    setSelectedStatement(ps);
    setIsEditDialogOpen(true);
  }

  const handleDeleteStatement = async (statementId: string) => {
    try {
      await deleteDoc(doc(db, "problemStatements", statementId));
      toast({ title: "Success", description: "Problem statement has been deleted." });
    } catch (error) {
       console.error("Error deleting problem statement:", error);
       toast({ title: "Error", description: "Could not delete problem statement.", variant: "destructive" });
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error("Failed to read file buffer.");
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as ArrayBuffer);
        const worksheet = workbook.worksheets[0];
        const jsonData: any[] = [];
        const header = (worksheet.getRow(1).values as string[]).slice(1);
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header
                let rowData: any = {};
                row.values.forEach((value, index) => {
                    if (index > 0) { // Skip empty first cell from exceljs
                      const key = header[index - 1];
                      rowData[key] = (value as any)?.text || value;
                    }
                });
                jsonData.push(rowData);
            }
        });
        
        setPreviewData(jsonData);

        const base64Reader = new FileReader();
        base64Reader.readAsDataURL(file);
        base64Reader.onloadend = () => {
           setFileToUpload(base64Reader.result as string);
           setIsUploading(false);
           setIsPreviewOpen(true);
        };

      } catch (error: any) {
        toast({
          title: "Error Reading File",
          description: error.message || "Could not parse the Excel file.",
          variant: "destructive",
        });
        setIsUploading(false);
      }
    };
  };

  const handleConfirmUpload = async () => {
    if (!fileToUpload) return;
    
    setIsUploading(true);
    setIsPreviewOpen(false);
    toast({ title: "Uploading...", description: "Your file is being processed. This may take a moment." });

    try {
      const base64Content = fileToUpload.split(',')[1];
      const result = await bulkUploadProblemStatements({ fileContent: base64Content });
      
      if (result.success) {
        toast({
          title: "Upload Successful",
          description: result.message,
          duration: 10000,
        });
        if (result.errors && result.errors.length > 0) {
          console.warn("Bulk upload errors:", result.errors);
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An unexpected error occurred during the file upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
      setFileToUpload(null);
      setPreviewData([]);
    }
  };

  return (
    <>
      <AddProblemStatementDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      {selectedStatement && (
        <EditProblemStatementDialog
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            problemStatement={selectedStatement}
        />
      )}
      <BulkUploadPreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        data={previewData}
        onConfirm={handleConfirmUpload}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline">Problem Statements</h1>
            <p className="text-muted-foreground">Manage hackathon problem statements.</p>
          </div>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Bulk Upload
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Statement
            </Button>
          </div>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>All Problem Statements</CardTitle>
                <CardDescription>{problemStatements.length} statements found</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : problemStatements.length > 0 ? (
                  <ul className="space-y-4">
                    {problemStatements.map(ps => {
                      const teamCount = getTeamCountForStatement(ps.id);
                      return (
                        <li key={ps.id} className="p-4 border rounded-md relative group">
                           <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-lg">{ps.title} <span className="text-sm font-normal text-muted-foreground">{ps.problemStatementId ? `(ID: ${ps.problemStatementId})` : ''}</span></h3>
                             <div className="flex items-center gap-2">
                                <Badge variant={ps.category === 'Software' ? 'default' : ps.category === 'Hardware' ? 'secondary' : 'outline'}>{ps.category}</Badge>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleEditClick(ps)}>
                                  <Pencil className="h-4 w-4"/>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive">
                                        <Trash2 className="h-4 w-4"/>
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the problem statement "{ps.title}".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteStatement(ps.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                             </div>
                           </div>
                           
                           {ps.description && <p className="text-sm text-muted-foreground mb-3">{ps.description}</p>}
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              {ps.organization && <div><strong>Organization:</strong> {ps.organization}</div>}
                              {ps.department && <div><strong>Department:</strong> {ps.department}</div>}
                              {ps.theme && <div><strong>Theme:</strong> {ps.theme}</div>}
                              {ps.youtubeLink && <div><strong>YouTube:</strong> <a href={ps.youtubeLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a></div>}
                              {ps.datasetLink && <div><strong>Dataset:</strong> <a href={ps.datasetLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a></div>}
                           </div>
                           {ps.contactInfo && <div className="mt-2 text-sm"><strong>Contact:</strong> {ps.contactInfo}</div>}
                           <div className="mt-4 flex items-center justify-between border-t pt-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span>{teamCount} {teamCount === 1 ? 'team' : 'teams'} registered</span>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/teams?problemStatementId=${ps.id}`}>View Teams</Link>
                                </Button>
                           </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : <p className="text-center text-muted-foreground py-4">No problem statements have been added yet.</p>}
            </CardContent>
          </Card>
      </div>
    </>
  );
}
