
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
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createJuryPanel } from "@/ai/flows/create-jury-panel-flow";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

interface AddJuryPanelDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPanelAdded: () => void;
}

const juryMemberSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email(),
  institute: z.string().min(1, "Institute is required."),
  contactNumber: z.string().regex(/^\d{10}$/, "A valid 10-digit contact number is required."),
  department: z.string().min(2, "Department is required."),
  highestQualification: z.string().min(2, "Highest qualification is required."),
  experience: z.string().min(1, "Experience is required."),
});

const panelSchema = z.object({
  panelName: z.string().min(3, "Panel name must be at least 3 characters."),
  juryMembers: z.array(juryMemberSchema).length(3, "A panel must have exactly 3 jury members."),
});

export function AddJuryPanelDialog({ isOpen, onOpenChange, onPanelAdded }: AddJuryPanelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof panelSchema>>({
    resolver: zodResolver(panelSchema),
    defaultValues: {
      panelName: "",
      juryMembers: [
        { name: "", email: "", institute: "", contactNumber: "", department: "", highestQualification: "", experience: "" },
        { name: "", email: "", institute: "", contactNumber: "", department: "", highestQualification: "", experience: "" },
        { name: "", email: "", institute: "", contactNumber: "", department: "", highestQualification: "", experience: "" },
      ],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "juryMembers",
  });

  useEffect(() => {
    const q = query(collection(db, "institutes"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setInstitutes(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return () => unsubscribe();
  }, []);

  const onSubmit = async (values: z.infer<typeof panelSchema>) => {
    setIsLoading(true);
    try {
      const result = await createJuryPanel(values);
      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
          duration: 8000,
        });
        onPanelAdded();
        onOpenChange(false);
        form.reset();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Failed to create Jury Panel", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Jury Panel</DialogTitle>
          <DialogDescription>
            Enter a name for the panel and provide the details for all three jury members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[65vh] pr-6">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="panelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Panel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Software Panel Alpha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4 border p-4 rounded-md">
                     <h3 className="font-semibold text-lg">Jury Member {index + 1}</h3>
                     <Separator />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name={`juryMembers.${index}.name`}
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
                            name={`juryMembers.${index}.email`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="member@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name={`juryMembers.${index}.institute`}
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
                                    {institutes.map((inst) => (
                                        <SelectItem key={inst.id} value={inst.name}>{inst.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                            control={form.control}
                            name={`juryMembers.${index}.contactNumber`}
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
                     </div>
                      <FormField
                        control={form.control}
                        name={`juryMembers.${index}.department`}
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Department</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Computer Engineering" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name={`juryMembers.${index}.highestQualification`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Highest Qualification</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Ph.D. in CSE" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`juryMembers.${index}.experience`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Years of Experience</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 10" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="pt-8">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Panel & Send Invites
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

