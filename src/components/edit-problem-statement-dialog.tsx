"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScrollArea } from "./ui/scroll-area";
import { ProblemStatement } from "@/lib/types";

interface EditProblemStatementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  problemStatement: ProblemStatement;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  category: z.enum(["Software", "Hardware"], {
    required_error: "You need to select a problem statement category.",
  }),
  description: z.string().optional(),
  organization: z.string().optional(),
  department: z.string().optional(),
  theme: z.string().optional(),
  youtubeLink: z.string().url().optional().or(z.literal('')),
  datasetLink: z.string().url().optional().or(z.literal('')),
  contactInfo: z.string().optional(),
});

export function EditProblemStatementDialog({ isOpen, onOpenChange, problemStatement }: EditProblemStatementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      organization: "",
      department: "",
      theme: "",
      youtubeLink: "",
      datasetLink: "",
      contactInfo: "",
    },
  });

  useEffect(() => {
    if (problemStatement) {
      form.reset({
        title: problemStatement.title || "",
        category: problemStatement.category,
        description: problemStatement.description || "",
        organization: problemStatement.organization || "",
        department: problemStatement.department || "",
        theme: problemStatement.theme || "",
        youtubeLink: problemStatement.youtubeLink || "",
        datasetLink: problemStatement.datasetLink || "",
        contactInfo: problemStatement.contactInfo || "",
      });
    }
  }, [problemStatement, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const problemStatementRef = doc(db, "problemStatements", problemStatement.id);
      await updateDoc(problemStatementRef, values);

      toast({
        title: "Success",
        description: "The problem statement has been updated.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating problem statement:", error);
      toast({
        title: "Error",
        description: "Could not update the problem statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Problem Statement</DialogTitle>
          <DialogDescription>
            Modify the details for this problem statement. The ID ({problemStatement.problemStatementId}) cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 py-4">
               <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AI-Powered Waste Segregation System" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Software" />
                          </FormControl>
                          <FormLabel className="font-normal">Software</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Hardware" />
                          </FormControl>
                          <FormLabel className="font-normal">Hardware</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of the problem, its context, and what a successful solution would look like."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Godrej" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Godrej Appliances" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Smart Automation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="youtubeLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="datasetLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dataset Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/dataset" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Info (Optional)</FormLabel>
                    <FormControl>
                       <Textarea
                        placeholder="Provide contact details for any queries regarding the problem statement."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}