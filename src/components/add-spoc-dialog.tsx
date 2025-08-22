
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { INSTITUTES } from "@/lib/constants";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createSpoc, CreateSpocInput } from "@/ai/flows/create-spoc-flow";

interface AddSpocDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSpocAdded: () => void;
}

const spocSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address.").refine(
    (email) => email.endsWith('@paruluniversity.ac.in'),
    { message: "Email must end with @paruluniversity.ac.in" }
  ),
  institute: z.string().min(1, "Please select an institute."),
  contactNumber: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
});

export function AddSpocDialog({ isOpen, onOpenChange, onSpocAdded }: AddSpocDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof spocSchema>>({
    resolver: zodResolver(spocSchema),
    defaultValues: {
      name: "",
      email: "",
      institute: "",
      contactNumber: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof spocSchema>) => {
    setIsLoading(true);
    try {
      const result = await createSpoc(values as CreateSpocInput);
      if (result.success) {
        toast({
          title: "SPOC Action Required",
          description: result.message,
          duration: 15000, // Make toast stay longer
        });
        onSpocAdded(); // Callback to refresh the list
        onOpenChange(false); // Close the dialog
        form.reset();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to create SPOC", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New SPOC</DialogTitle>
          <DialogDescription>
            Create a new Single Point of Contact (SPOC). Their login credentials will be emailed to them automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="spoc@paruluniversity.ac.in" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="institute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institute</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an institute" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INSTITUTES.map((inst) => (
                          <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create SPOC
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
