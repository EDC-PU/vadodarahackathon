
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Team, Mentor } from "@/lib/types";
import { Loader2, User, Pencil, X } from "lucide-react";
import { setMentorDetails } from "@/ai/flows/set-mentor-details-flow";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";

const formSchema = z.object({
  name: z.string().min(2, "Mentor name is required."),
  department: z.string().min(1, "Department is required."),
  phoneNumber: z.string().regex(/^\d{10}$/, "A valid 10-digit phone number is required."),
  email: z.string().email("A valid email is required."),
  gender: z.enum(["M", "F", "O"], { required_error: "Gender is required." }),
});

interface MentorDetailsFormProps {
  team: Team;
  canEdit: boolean;
}

export function MentorDetailsForm({ team, canEdit }: MentorDetailsFormProps) {
  const { user, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: team.mentor?.name || "",
      department: team.mentor?.department || "",
      phoneNumber: team.mentor?.phoneNumber || "",
      email: team.mentor?.email || "",
      gender: team.mentor?.gender || undefined,
    },
  });

  useEffect(() => {
    // Fetch departments for Parul University
    const q = query(collection(db, "departments"), where("name", "==", "Parul University"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setDepartments(snapshot.docs[0].data().departments.sort() || []);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    form.reset({
      name: team.mentor?.name || "",
      department: team.mentor?.department || "",
      phoneNumber: team.mentor?.phoneNumber || "",
      email: team.mentor?.email || "",
      gender: team.mentor?.gender || undefined,
    });
     // If mentor details exist, start in non-editing mode
    if (team.mentor) {
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [team.mentor, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !team) return;

    setIsLoading(true);
    try {
      const result = await setMentorDetails({
        teamId: team.id,
        leaderUid: user.uid,
        mentor: values,
      });

      if (result.success) {
        toast({ title: "Success", description: "Mentor details have been saved." });
        setIsEditing(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Could not save mentor details: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isEditing && team.mentor) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-start">
            <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> <span className="font-semibold">{team.mentor?.name}</span> ({team.mentor?.gender})</p>
                <p><strong>Department:</strong> {team.mentor?.department}</p>
                <p><strong>Email:</strong> {team.mentor?.email}</p>
                <p><strong>Phone:</strong> {team.mentor?.phoneNumber}</p>
            </div>
             {canEdit && (
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4" />
                </Button>
            )}
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mentor's Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Gender</FormLabel>
                <FormControl>
                    <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center space-x-4 pt-2"
                    >
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="M" /></FormControl><FormLabel className="font-normal">Male</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="F" /></FormControl><FormLabel className="font-normal">Female</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="O" /></FormControl><FormLabel className="font-normal">Other</FormLabel></FormItem>
                    </RadioGroup>
                    </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Department (Parul University)</FormLabel>
                 <FormControl>
                  <Input placeholder="e.g. Computer Engineering" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mentor's Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="mentor@paruluniversity.ac.in" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mentor's Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="9876543210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2">
           {team.mentor && (
             <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isLoading}>
                <X className="mr-2 h-4 w-4"/> Cancel
            </Button>
           )}
          <Button type="submit" disabled={isLoading || authLoading || !canEdit}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Mentor Details
          </Button>
        </div>
      </form>
    </Form>
  );
}
