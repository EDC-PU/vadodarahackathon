
"use client";

import { useState } from "react";
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
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ScrollArea } from "./ui/scroll-area";

interface AddProblemStatementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  problemStatementId: z.string().min(1, "Problem Statement ID is required."),
  title: z.string().min(10, "Title must be at least 10 characters long."),
  description: z.string().min(50, "Description must be at least 50 characters long."),
  organization: z.string().min(1, "Organization is required."),
  department: z.string().min(1, "Department is required."),
  category: z.enum(["Software", "Hardware", "Hardware & Software"], {
    required_error: "You need to select a problem statement category.",
  }),
  theme: z.string().min(1, "Theme is required."),
  youtubeLink: z.string().url().optional().or(z.literal('')),
  datasetLink: z.string().url().optional().or(z.literal('')),
  contactInfo: z.string().optional(),
});

export function AddProblemStatementDialog({ isOpen, onOpenChange }: AddProblemStatementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemStatementId: "",
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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await addDoc(collection(db, "problemStatements"), {
        ...values,
        createdAt: new Date(),
      });

      toast({
        title: "Success",
        description: "The new problem statement has been added.",
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding problem statement:", error);
      toast({
        title: "Error",
        description: "Could not add the problem statement. Please try again.",
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
          <DialogTitle>Add New Problem Statement</DialogTitle>
          <DialogDescription>
            Fill in the details for the new problem statement. It will be available for teams to select.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="problemStatementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem Statement ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1525" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
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
                      <FormLabel>Organization</FormLabel>
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
                      <FormLabel>Department</FormLabel>
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
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Hardware & Software" />
                          </FormControl>
                          <FormLabel className="font-normal">Hardware & Software</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
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
                Add Statement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
