
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { INSTITUTES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { SmartFieldTip } from "./smart-field-tip";
import { db } from "@/lib/firebase";
import { doc, setDoc, writeBatch, getDoc, collection, updateDoc, query, where, getDocs } from "firebase/firestore";
import { Separator } from "./ui/separator";
import { UserProfile } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  teamName: z.string().min(3, { message: "Team name must be at least 3 characters." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Please select a gender." }),
  institute: z.string({ required_error: "Please select an institute." }),
  department: z.string().min(2, { message: "Department is required." }),
  enrollmentNumber: z.string().min(5, { message: "Enrollment number is required." }),
  semester: z.coerce.number({invalid_type_error: "Semester is required."}).min(1, { message: "Semester must be between 1 and 8." }).max(8, { message: "Semester must be between 1 and 8." }),
  yearOfStudy: z.string().min(1, { message: "Year of study is required." }),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
});

export function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading, reloadUser } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: "",
      name: "",
      institute: "",
      department: "",
      enrollmentNumber: "",
      contactNumber: "",
      gender: undefined,
      semester: undefined,
      yearOfStudy: "",
    },
  });

  useEffect(() => {
    if (user) {
        console.log("RegistrationForm: Auth user loaded, resetting form values.", user);
        form.reset({
            teamName: "",
            name: user.name || "",
            institute: user.institute || "",
            department: user.department || "",
            enrollmentNumber: user.enrollmentNumber || "",
            contactNumber: user.contactNumber || "",
            gender: user.gender || undefined,
            yearOfStudy: user.yearOfStudy || "",
            semester: user.semester || undefined,
        });
    }
  }, [user, form]);
  
  const createTeamAndAssignLeader = async (values: z.infer<typeof formSchema>) => {
    console.log("createTeamAndAssignLeader function called with values:", values);
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a team.", variant: "destructive" });
      console.error("Team creation failed: User not logged in.");
      return;
    }

    console.log(`Checking for uniqueness of team name: "${values.teamName}"`);
    // Check for team name uniqueness
    const teamsRef = collection(db, "teams");
    const q = query(teamsRef, where("name", "==", values.teamName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.error("Team name already exists.");
      toast({
        title: "Team Name Taken",
        description: "A team with this name already exists. Please choose another name.",
        variant: "destructive",
      });
      return;
    }
    console.log("Team name is unique. Proceeding with creation.");

    const batch = writeBatch(db);
    console.log("Write batch created.");

    // 1. Create Team
    const teamDocRef = doc(collection(db, "teams"));
    console.log(`Generated new team document ID: ${teamDocRef.id}`);
    const teamData = {
      id: teamDocRef.id,
      name: values.teamName,
      leader: {
          uid: user.uid,
          name: values.name,
          email: user.email,
      },
      institute: values.institute,
      department: values.department,
      members: [], // Start with empty members array
    };
    batch.set(teamDocRef, teamData);
    console.log("Batch operation: Set new team data.", teamData);

    // 2. Update User Profile to be a leader and link to team
    const userDocRef = doc(db, "users", user.uid);
    const userProfileUpdate: Partial<UserProfile> = {
      role: "leader",
      teamId: teamDocRef.id,
      name: values.name,
      gender: values.gender as "Male" | "Female" | "Other",
      institute: values.institute,
      department: values.department,
      enrollmentNumber: values.enrollmentNumber,
      contactNumber: values.contactNumber,
      semester: values.semester,
      yearOfStudy: values.yearOfStudy,
      passwordChanged: true, // They are creating their team, so they've passed the initial password change step
    };
    batch.update(userDocRef, userProfileUpdate);
    console.log("Batch operation: Update user profile.", userProfileUpdate);
    
    console.log("Committing batch write...");
    await batch.commit();
    console.log("Batch write successful.");

    return true;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("RegistrationForm onSubmit triggered.");
    setIsLoading(true);
    try {
      const success = await createTeamAndAssignLeader(values);
      if (success) {
        toast({
          title: "Team Registered!",
          description: `Your team "${values.teamName}" has been successfully created.`,
        });
        console.log("Team registration successful, reloading user to trigger redirect...");
        await reloadUser();
      } else {
        console.log("Team registration failed, not redirecting.");
      }
    } catch (error: any) {
       console.error("Team Registration Error:", error);
       toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const formDescription = "This is a registration form for the Vadodara Hackathon 6.0. Team leaders should fill out their personal and academic details to create their account and team.";

  if (authLoading) {
    console.log("RegistrationForm: Auth is loading...");
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Team Details</h3>
                <Separator />
            </div>
            
            <FormField
              control={form.control}
              name="teamName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                     <div className="flex items-center gap-2">
                        <Input placeholder="e.g., Tech Titans" {...field} disabled={isLoading}/>
                        <SmartFieldTip fieldName="Team Name" formContext={formDescription} />
                      </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2 pt-4">
                <h3 className="text-lg font-medium">Team Leader&apos;s Details</h3>
                <p className="text-sm text-muted-foreground">Your email: {user?.email}</p>
                <Separator />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} disabled={isLoading}/>
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
                          disabled={isLoading}
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Male" />
                            </FormControl>
                            <FormLabel className="font-normal">Male</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Female" />
                            </FormControl>
                            <FormLabel className="font-normal">Female</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Other" />
                            </FormControl>
                            <FormLabel className="font-normal">Other</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="institute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institute</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your institute" />
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
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Computer Engineering" {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="enrollmentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrollment No.</FormLabel>
                    <FormControl>
                      <Input placeholder="20030310XXXX" {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearOfStudy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year of Study</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 3" {...field} disabled={isLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} disabled={isLoading}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading || authLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Team & Finish Registration
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
