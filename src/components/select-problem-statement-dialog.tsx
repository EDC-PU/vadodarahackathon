
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { ProblemStatement } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface SelectProblemStatementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  teamCategory: 'Software' | 'Hardware';
  onProblemStatementSelect: (problemStatement: ProblemStatement) => void;
}

export function SelectProblemStatementDialog({ isOpen, onOpenChange, teamCategory, onProblemStatementSelect }: SelectProblemStatementDialogProps) {
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [filteredStatements, setFilteredStatements] = useState<ProblemStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchProblemStatements = async () => {
        setIsLoading(true);
        try {
          // Fetch statements that match the team's category OR are "Hardware & Software"
          const applicableCategories = [teamCategory, "Hardware & Software"];
          const q = query(collection(db, "problemStatements"), where("category", "in", applicableCategories));
          
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
    }
  }, [isOpen, teamCategory, toast]);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = problemStatements.filter(item => {
      return (
        item.title.toLowerCase().includes(lowercasedFilter) ||
        item.description.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredStatements(filteredData);
  }, [searchTerm, problemStatements]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select a Problem Statement</DialogTitle>
          <DialogDescription>
            Choose a problem statement for your team. Your selection is based on your team's category ({teamCategory}).
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Search by title or keyword..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
        </div>
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredStatements.length > 0 ? (
              filteredStatements.map(ps => (
                <div key={ps.id} className={cn("p-4 border rounded-lg transition-all", 
                    "hover:border-primary hover:shadow-md cursor-pointer"
                )}
                onClick={() => onProblemStatementSelect(ps)}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{ps.title}</h3>
                        <Badge variant={ps.category === teamCategory ? 'default' : 'secondary'}>{ps.category}</Badge>
                    </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{ps.description}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No matching problem statements found.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

    