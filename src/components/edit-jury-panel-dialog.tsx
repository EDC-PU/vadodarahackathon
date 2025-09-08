
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
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JuryPanel, UserProfile } from "@/lib/types";
import { updateJuryPanel } from "@/ai/flows/update-jury-panel-flow";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";

interface EditJuryPanelDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  panel: JuryPanel;
  onPanelUpdated: () => void;
}

const juryMemberEditSchema = z.object({
    uid: z.string().optional(), // Optional for new members
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
  studentCoordinatorName: z.string().min(2, "Coordinator name is required.").optional().or(z.literal('')),
  studentCoordinatorContact: z.string().regex(/^\d{10}$/, "A valid 10-digit contact number is required.").optional().or(z.literal('')),
  juryMembers: z.array(juryMemberEditSchema).length(3, "A panel must have exactly 3 jury members."),
});

export function EditJuryPanelDialog({ isOpen, onOpenChange, panel, onPanelUpdated }: EditJuryPanelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof panelSchema>>({
    resolver: zodResolver(panelSchema),
    defaultValues: {
      panelName: "",
      studentCoordinatorName: "",
      studentCoordinatorContact: "",
      juryMembers: [],
    },
  });
  
  const { fields, update, replace } = useFieldArray({
    control: form.control,
    name: "juryMembers",
  });
  
  const fetchAndSetPanelDetails = async () => {
    if (panel && isOpen) {
        const memberDetailsPromises = panel.members.map(async (member) => {
            if (!member.uid) return null;
            const userDocRef = doc(db, 'users', member.uid);
            const userDoc = await getDoc(userDocRef);
            return userDoc.exists() ? { uid: userDoc.id, ...userDoc.data() } as UserProfile : null;
        });

        const memberDetails = (await Promise.all(memberDetailsPromises)).filter(Boolean) as UserProfile[];
        
        form.reset({ 
            panelName: panel.name,
            studentCoordinatorName: panel.studentCoordinatorName || "",
            studentCoordinatorContact: panel.studentCoordinatorContact || "",
            juryMembers: memberDetails.map(m => ({
                uid: m.uid,
                name: m.name || "",
                email: m.email || "",
                institute: m.institute || "",
                contactNumber: m.contactNumber || "",
                department: m.department || "",
                highestQualification: m.highestQualification || "",
                experience: m.experience || "",
            }))
        });
      }
  };

  useEffect(() => {
    const q = query(collection(db, "institutes"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setInstitutes(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    fetchAndSetPanelDetails();

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, isOpen]);


  const handleReplaceMember = (index: number) => {
    const currentValues = form.getValues();
    const newMembers = [...currentValues.juryMembers];
    newMembers[index] = {
        name: "",
        email: "",
        institute: "",
        contactNumber: "",
        department: "",
        highestQualification: "",
        experience: "",
        // uid is omitted, signifying a new member
    };
    replace(newMembers);
  }

  const onSubmit = async (values: z.infer<typeof panelSchema>) => {
    setIsLoading(true);
    try {
      const result = await updateJuryPanel({
        panelId: panel.id,
        panelName: values.panelName,
        studentCoordinatorName: values.studentCoordinatorName,
        studentCoordinatorContact: values.studentCoordinatorContact,
        juryMembers: values.juryMembers,
        originalMemberUids: panel.members.map(m => m.uid),
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
        });
        onPanelUpdated();
        onOpenChange(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
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
          <DialogTitle>Edit Panel Details</DialogTitle>
          <DialogDescription>
            Update the panel's name, coordinator, or replace jury members. Replacing a member will delete their old account and create a new one.
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
                            <Input {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="studentCoordinatorName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Coordinator Name</FormLabel>
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
                            <FormLabel>Coordinator Contact</FormLabel>
                            <FormControl>
                                <Input placeholder="9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                     <Separator />
                     {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 relative">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-lg">Jury Member {index + 1}</h3>
                                     <Button type="button" variant="outline" size="sm" onClick={() => handleReplaceMember(index)}>
                                        <RefreshCw className="mr-2 h-3 w-3" /> Replace Member
                                    </Button>
                                </div>
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
                                                <Input type="email" placeholder="member@example.com" {...field} disabled={!!form.getValues(`juryMembers.${index}.uid`)} />
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
                                            <Select onValueChange={field.onChange} value={field.value}>
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
                        </Card>
                    ))}
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
