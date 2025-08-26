
"use client";

import { useMemo, useState } from 'react';
import { ProblemStatement, ProblemStatementCategory } from '@/lib/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Building, Book, BrainCircuit, Database } from 'lucide-react';
import Link from 'next/link';

interface ProblemStatementsSectionProps {
  initialProblemStatements: ProblemStatement[];
}

type CategoryFilter = ProblemStatementCategory | "All";
const ITEMS_PER_PAGE = 10;

const SectionTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
      <h2
        className={"text-3xl font-bold mb-4 font-headline relative inline-block"}
      >
        {children}
         <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-red"
        />
      </h2>
    );
  };

export function ProblemStatementsSection({ initialProblemStatements }: ProblemStatementsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [selectedStatement, setSelectedStatement] = useState<ProblemStatement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredStatements = useMemo(() => {
    if (categoryFilter === "All") {
      return initialProblemStatements;
    }
    return initialProblemStatements.filter(ps => ps.category === categoryFilter);
  }, [initialProblemStatements, categoryFilter]);

  const paginatedStatements = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStatements.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStatements, currentPage]);

  const totalPages = Math.ceil(filteredStatements.length / ITEMS_PER_PAGE);

  const handleCategoryFilter = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleStatementClick = (statement: ProblemStatement) => {
    setSelectedStatement(statement);
    setIsDialogOpen(true);
  };

  const categories: CategoryFilter[] = ["All", "Software", "Hardware"];

  return (
    <>
      <Card className="glass-card w-full">
        <CardHeader className="text-center">
            <SectionTitle>Problem Statements</SectionTitle>
          <CardDescription>
            Explore the challenges for this year's hackathon. Click on a title for more details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center flex-wrap gap-2 mb-4">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? "default" : "outline"}
                onClick={() => handleCategoryFilter(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[200px] text-right hidden md:table-cell">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStatements.length > 0 ? (
                  paginatedStatements.map(ps => (
                    <TableRow key={ps.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleStatementClick(ps)}
                          className="text-left hover:underline"
                        >
                          {ps.title}
                        </button>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <Badge variant={ps.category === 'Software' ? 'default' : 'secondary'}>
                          {ps.category}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No problem statements match this category.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedStatement && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedStatement.title}</DialogTitle>
                <DialogDescription>
                  ID: {selectedStatement.problemStatementId} | Category: {selectedStatement.category}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6 py-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedStatement.description || "No description provided."}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {selectedStatement.organization && <div className="flex items-center gap-2"><Building className="h-4 w-4 text-primary shrink-0" /><div><strong>Organization:</strong> {selectedStatement.organization}</div></div>}
                    {selectedStatement.department && <div className="flex items-center gap-2"><Book className="h-4 w-4 text-primary shrink-0" /><div><strong>Department:</strong> {selectedStatement.department}</div></div>}
                    {selectedStatement.theme && <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary shrink-0" /><div><strong>Theme/Bucket:</strong> {selectedStatement.theme}</div></div>}
                    {selectedStatement.datasetLink && (
                        <div className="flex items-start gap-2">
                            <Database className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div><strong>Dataset:</strong> <Link href={selectedStatement.datasetLink} target="_blank" className="text-primary hover:underline break-all">{selectedStatement.datasetLink}</Link></div>
                        </div>
                    )}
                    {selectedStatement.youtubeLink && (
                        <div className="flex items-start gap-2">
                             <Database className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                             <div><strong>YouTube:</strong> <Link href={selectedStatement.youtubeLink} target="_blank" className="text-primary hover:underline break-all">{selectedStatement.youtubeLink}</Link></div>
                        </div>
                    )}
                  </div>
                  
                  {selectedStatement.contactInfo && (
                     <div>
                        <h4 className="font-semibold mb-2">Contact Information</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedStatement.contactInfo}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
