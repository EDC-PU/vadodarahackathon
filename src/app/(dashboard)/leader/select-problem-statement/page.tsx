
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
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
          (item.problemStatementId && item.problemStatementId.toLowerCase().includes(lowercasedFilter))
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
            <div className="space-y-3 pr-4">
                {filteredStatements.length > 0 ? (
                filteredStatements.map(ps => (
                    <div key={ps.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant={ps.category === 'Software' ? 'default' : 'secondary'}>{ps.category}</Badge>
                                <h3 className="font-semibold">{ps.title} ({ps.problemStatementId})</h3>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ps.description}</p>
                        </div>
                        <Button 
                            onClick={() => handleProblemStatementSelect(ps)}
                            disabled={!!isSubmitting}
                            className="w-full sm:w-auto"
                        >
                           {isSubmitting === ps.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Select
                        </Button>
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
