
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

interface BulkUploadPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  onConfirm: () => void;
}

export function BulkUploadPreviewDialog({ isOpen, onOpenChange, data, onConfirm }: BulkUploadPreviewDialogProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const headers = Object.keys(data[0] || {});

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Confirm Bulk Upload</DialogTitle>
          <DialogDescription>
            Review the data below. If it's correct, click "Confirm Upload" to add these problem statements to the database.
            Found {data.length} records.
          </DialogDescription>
        </DialogHeader>
        
        {data.length > 0 ? (
          <ScrollArea className="h-[60vh] border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {headers.map((header) => (
                      <TableCell key={`${rowIndex}-${header}`} className="text-xs">
                        {row[header]?.toString() || ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
                <AlertCircle className="mr-2 h-4 w-4" />
                No data to preview.
            </div>
        )}
        
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={data.length === 0}>
            Confirm Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
