
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search, BrainCircuit, Building, Book, Database } from "lucide-react";
import { ProblemStatement, ProblemStatementCategory } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CategoryFilter = ProblemStatementCategory | "All";

export default function SelectProblemStatementPage() {
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [filteredStatements, setFilteredStatements] = useState<ProblemStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProblemStatements = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "problemStatements"),
          orderBy("problemStatementId")
        );
        const querySnapshot = await getDocs(q);
        const statements = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
        setProblemStatements(statements);
        setFilteredStatements(statements);
      } catch (error) {
        console.error("Error fetching problem statements:", error);
        toast({
          title: "Error",
          description: "Could not load problem statements.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProblemStatements();
  }, [toast]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = problemStatements
      .filter(item => {
        if (categoryFilter === "All") return true;
        return item.category === categoryFilter;
      })
      .filter(item => {
        return (
          item.title.toLowerCase().includes(lowercasedFilter) ||
          (item.description && item.description.toLowerCase().includes(lowercasedFilter)) ||
          (item.problemStatementId && item.problemStatementId.toLowerCase().includes(lowercasedFilter)) ||
          (item.organization && item.organization.toLowerCase().includes(lowercasedFilter)) ||
          (item.theme && item.theme.toLowerCase().includes(lowercasedFilter))
        );
      });
    setFilteredStatements(filteredData);
  }, [searchTerm, problemStatements, categoryFilter]);

  const handleProblemStatementSelect = async (ps: ProblemStatement) => {
    if (!user?.teamId) {
        toast({ title: "Error", description: "Team information not found.", variant: "destructive" });
        return;
    }
    setIsSubmitting(ps.id);
    try {
        const teamDocRef = doc(db, 'teams', user.teamId);
        await updateDoc(teamDocRef, {
            problemStatementId: ps.id,
            problemStatementTitle: ps.title,
            category: ps.category,
        });
        toast({ title: "Success", description: `Problem statement "${ps.title}" selected.` });
        router.push('/leader');
    } catch (error) {
        console.error("Error selecting problem statement:", error);
        toast({ title: "Error", description: "Could not select problem statement.", variant: "destructive" });
    } finally {
        setIsSubmitting(null);
    }
  };
  
  if (authLoading || isLoading) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  const filters: CategoryFilter[] = ["All", "Software", "Hardware", "Hardware & Software"];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Select a Problem Statement</CardTitle>
          <CardDescription>
            Choose a problem statement for your team. Your team category will be set based on your selection.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4 mb-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by ID, title or keyword..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {filters.map(filter => (
                         <Button 
                            key={filter} 
                            variant={categoryFilter === filter ? "default" : "outline"}
                            onClick={() => setCategoryFilter(filter)}
                         >
                            {filter}
                         </Button>
                    ))}
                </div>
            </div>
            <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
                {filteredStatements.length > 0 ? (
                filteredStatements.map(ps => (
                    <div key={ps.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <Badge variant={ps.category === 'Software' ? 'default' : ps.category === 'Hardware' ? 'secondary' : 'outline'}>{ps.category}</Badge>
                                    <h3 className="font-semibold text-lg mt-1">{ps.title} ({ps.problemStatementId})</h3>
                                </div>
                                <Button 
                                    onClick={() => handleProblemStatementSelect(ps)}
                                    disabled={!!isSubmitting}
                                    className="w-full sm:w-auto shrink-0"
                                >
                                   {isSubmitting === ps.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                   Select
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{ps.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                {ps.organization && <div className="flex items-center gap-2"><Building className="h-4 w-4 text-primary shrink-0" /><div><strong>Organization:</strong> {ps.organization}</div></div>}
                                {ps.department && <div className="flex items-center gap-2"><Book className="h-4 w-4 text-primary shrink-0" /><div><strong>Department:</strong> {ps.department}</div></div>}
                                {ps.theme && <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary shrink-0" /><div><strong>Theme/Bucket:</strong> {ps.theme}</div></div>}
                                {ps.datasetLink && (
                                    <div className="flex items-center gap-2">
                                        <Database className="h-4 w-4 text-primary shrink-0" />
                                        <div>
                                            <strong>Dataset:</strong>{' '}
                                            <a href={ps.datasetLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                                {ps.datasetLink}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
                ) : (
                <p className="text-center text-muted-foreground py-10">No matching problem statements found.</p>
                )}
            </div>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
