
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { ProblemStatement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AddProblemStatementDialog } from "@/components/add-problem-statement-dialog";
import { Badge } from "@/components/ui/badge";

export default function ProblemStatementsPage() {
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddProblemStatementOpen, setIsAddProblemStatementOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const problemStatementsCollection = collection(db, 'problemStatements');
    // Order by the auto-generated ID to keep them in sequence
    const q = query(problemStatementsCollection, orderBy("problemStatementId"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const statementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
        setProblemStatements(statementsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching problem statements:", error);
        toast({ title: "Error", description: "Failed to fetch problem statements.", variant: "destructive" });
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [toast]);

  return (
    <>
      <AddProblemStatementDialog
        isOpen={isAddProblemStatementOpen}
        onOpenChange={setIsAddProblemStatementOpen}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline">Problem Statements</h1>
            <p className="text-muted-foreground">Manage hackathon problem statements.</p>
          </div>
           <Button onClick={() => setIsAddProblemStatementOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Statement
            </Button>
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
                    {problemStatements.map(ps => (
                        <li key={ps.id} className="p-4 border rounded-md">
                           <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-lg">{ps.title} <span className="text-sm font-normal text-muted-foreground">{ps.problemStatementId ? `(ID: ${ps.problemStatementId})` : ''}</span></h3>
                             <Badge variant={ps.category === 'Software' ? 'default' : ps.category === 'Hardware' ? 'secondary' : 'outline'}>{ps.category}</Badge>
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
                        </li>
                    ))}
                  </ul>
                ) : <p className="text-center text-muted-foreground py-4">No problem statements have been added yet.</p>}
            </CardContent>
          </Card>
      </div>
    </>
  );
}
