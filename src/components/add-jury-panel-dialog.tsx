
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
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
});

const panelSchema = z.object({
  panelName: z.string().min(3, "Panel name must be at least 3 characters."),
  studentCoordinatorName: z.string().min(2, "Coordinator name is required.").optional().or(z.literal('')),
  studentCoordinatorContact: z.string().regex(/^\d{10}$/, "A valid 10-digit contact number is required.").optional().or(z.literal('')),
  juryMembers: z.array(juryMemberSchema).min(2, "A panel must have at least 2 members.").max(4, "A panel can have at most 4 members."),
  isDraft: z.boolean().optional(),
});

export function AddJuryPanelDialog({ isOpen, onOpenChange, onPanelAdded }: AddJuryPanelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof panelSchema>>({
    resolver: zodResolver(panelSchema),
    defaultValues: {
      panelName: "",
      studentCoordinatorName: "",
      studentCoordinatorContact: "",
      juryMembers: [
        { name: "", email: "", institute: "", contactNumber: "", department: "" },
        { name: "", email: "", institute: "", contactNumber: "", department: "" },
      ],
      isDraft: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
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

  const handleFormSubmit = async (values: z.infer<typeof panelSchema>) => {
    setIsLoading(true);
    try {
      const result = await createJuryPanel({
        ...values,
        juryMembers: values.juryMembers.map(m => ({...m, highestQualification: '', experience: ''}))
      });
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
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Jury Panel</DialogTitle>
          <DialogDescription>
            Enter a name for the panel and provide the details for 2 to 4 jury members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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

                <Separator />
                <h3 className="font-semibold text-lg">Student Coordinator Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="studentCoordinatorName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Coordinator Name (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter coordinator's name" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="studentCoordinatorContact"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Coordinator Contact (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>


                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4 border p-4 rounded-md relative">
                     <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">Jury Member {index + 1}</h3>
                        {fields.length > 2 && (
                             <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        )}
                     </div>
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
                  </div>
                ))}
                {fields.length < 4 && (
                    <Button type="button" variant="outline" className="w-full" onClick={() => append({ name: "", email: "", institute: "", contactNumber: "", department: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Another Member
                    </Button>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="pt-8">
              <Button type="button" variant="secondary" onClick={form.handleSubmit(values => handleFormSubmit({...values, isDraft: true}))} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save as Draft
              </Button>
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
