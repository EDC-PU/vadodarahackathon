
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
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, writeBatch } from "firebase/firestore";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { Team, UserProfile } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Please select a gender." }),
  department: z.string().min(2, { message: "Department is required." }),
  enrollmentNumber: z.string().min(5, { message: "Enrollment number is required." }),
  semester: z.coerce.number({invalid_type_error: "Semester is required."}).min(1, { message: "Semester must be between 1 and 8." }).max(8, { message: "Semester must be between 1 and 8." }),
  yearOfStudy: z.string().min(1, { message: "Year of study is required." }),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
});

export function CompleteProfileForm() {
  const { user, loading: authLoading, redirectToDashboard } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      department: user?.department || "",
      enrollmentNumber: user?.enrollmentNumber || "",
      contactNumber: user?.contactNumber || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("CompleteProfileForm onSubmit triggered with values:", values);
    if (!user) {
        toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
        console.error("Profile completion failed: User not logged in.");
        return;
    }
    
    setIsLoading(true);
    try {
        console.log("Starting batch write for profile completion...");
        const batch = writeBatch(db);

        // 1. Update the user's own profile document
        const userDocRef = doc(db, "users", user.uid);
        const updatedProfileData: Partial<UserProfile> = {
            name: values.name,
            gender: values.gender,
            department: values.department,
            enrollmentNumber: values.enrollmentNumber,
            contactNumber: values.contactNumber,
        };
        batch.update(userDocRef, updatedProfileData);
        console.log(`Batch update queued for user document: ${user.uid}`);

        // 2. If user is a member of a team, update their details in the team document
        if (user.role === 'member' && user.teamId) {
            console.log(`User is a member of team ${user.teamId}. Fetching team document.`);
            const teamDocRef = doc(db, "teams", user.teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                console.log("Team document found. Updating member details in team array.");
                const teamData = teamDoc.data() as Team;
                const memberIndex = teamData.members.findIndex(m => m.email === user.email);
                
                if (memberIndex !== -1) {
                    const updatedMembers = [...teamData.members];
                    updatedMembers[memberIndex] = {
                        ...updatedMembers[memberIndex],
                        name: values.name,
                        gender: values.gender,
                        enrollmentNumber: values.enrollmentNumber,
                        contactNumber: values.contactNumber,
                    };
                    batch.update(teamDocRef, { members: updatedMembers });
                    console.log(`Batch update queued for team document ${user.teamId} at member index ${memberIndex}.`);
                } else {
                    console.warn(`Could not find member with email ${user.email} in team ${user.teamId} to update details.`);
                }
            } else {
                 console.warn(`Team document ${user.teamId} not found.`);
            }
        }
        
        console.log("Committing batch write...");
        await batch.commit();
        console.log("Batch write committed successfully.");

        toast({
            title: "Profile Updated!",
            description: "Redirecting to your dashboard.",
        });

        // Pass the updated user object to ensure redirection works correctly
        redirectToDashboard({ ...user, ...updatedProfileData });

    } catch (error: any) {
      console.error("Profile Update Error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
      return (
          <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                   <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                      <Input type="number" placeholder="e.g., 6" {...field} disabled={isLoading}/>
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
              Save and Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
