
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, writeBatch, setDoc, collection } from "firebase/firestore";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { Team, UserProfile, TeamInvite } from "@/lib/types";
import { addMemberToTeam } from "@/ai/flows/add-member-to-team-flow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INSTITUTES } from "@/lib/constants";


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["M", "F", "O"], { required_error: "Please select a gender." }),
  department: z.string({ required_error: "Please select or enter a department." }).min(1, "Please select or enter a department."),
  enrollmentNumber: z.string().min(5, { message: "Enrollment number is required." }),
  semester: z.coerce.number({invalid_type_error: "Semester is required."}).min(1, { message: "Semester must be between 1 and 8." }).max(8, { message: "Semester must be between 1 and 8." }),
  yearOfStudy: z.string().min(1, { message: "Year of study is required." }),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
});

export function CompleteProfileForm() {
  const { user, loading: authLoading, redirectToDashboard } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [departments, setDepartments] = useState<string[]>([]);
  const [isDeptLoading, setIsDeptLoading] = useState(false);
  const [teamInstitute, setTeamInstitute] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      department: undefined,
      enrollmentNumber: "",
      contactNumber: "",
      gender: undefined,
      semester: 1, // Default to 1 instead of undefined
      yearOfStudy: "",
    },
  });

  const selectedDepartment = useWatch({
    control: form.control,
    name: 'department'
  });
  
  useEffect(() => {
    const fetchTeamInstitute = async () => {
      const inviteToken = sessionStorage.getItem('inviteToken');
      if (inviteToken) {
          const inviteDocRef = doc(db, "teamInvites", inviteToken);
          const inviteDoc = await getDoc(inviteDocRef);
          if(inviteDoc.exists()) {
              const teamDocRef = doc(db, 'teams', inviteDoc.data().teamId);
              const teamDoc = await getDoc(teamDocRef);
              if(teamDoc.exists()) {
                  setTeamInstitute(teamDoc.data().institute);
              }
          }
      } else if (user?.institute) {
          setTeamInstitute(user.institute);
      }
    };
    fetchTeamInstitute();
  }, [user?.institute]);


  useEffect(() => {
    const fetchDepartments = async () => {
        if (!teamInstitute) {
            setDepartments([]);
            return;
        }
        setIsDeptLoading(true);
        try {
            const deptDocRef = doc(db, "departments", teamInstitute);
            const docSnap = await getDoc(deptDocRef);
            if (docSnap.exists()) {
                setDepartments(docSnap.data().departments.sort() || []);
            } else {
                setDepartments([]);
            }
        } catch (error) {
            console.error("Error fetching departments:", error);
            setDepartments([]);
        } finally {
            setIsDeptLoading(false);
        }
    };
    fetchDepartments();
  }, [teamInstitute]);


  useEffect(() => {
    if (user) {
        form.reset({
            name: user.name || "",
            department: user.department || undefined,
            enrollmentNumber: user.enrollmentNumber || "",
            contactNumber: user.contactNumber || "",
            gender: user.gender || undefined,
            semester: user.semester || undefined,
            yearOfStudy: user.yearOfStudy || "",
        })
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("CompleteProfileForm onSubmit triggered with values:", values);
    if (!user) {
        toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
        console.error("Profile completion failed: User not logged in.");
        return;
    }
    
    setIsLoading(true);
    try {
        console.log("Starting transaction for profile completion...");
        
        const updatedProfileData = {
            name: values.name,
            gender: values.gender,
            department: values.department,
            enrollmentNumber: values.enrollmentNumber,
            contactNumber: values.contactNumber,
            semester: values.semester,
            yearOfStudy: values.yearOfStudy,
            institute: teamInstitute, // Add institute to profile
        };
        
        const inviteToken = sessionStorage.getItem('inviteToken');
        let finalTeamId: string | undefined = undefined;

        if (inviteToken) {
            console.log("Found invite token, attempting to join team after profile completion.");
            const inviteDocRef = doc(db, "teamInvites", inviteToken);
            const inviteDoc = await getDoc(inviteDocRef);

            if (inviteDoc.exists()) {
                const inviteData = inviteDoc.data() as TeamInvite;
                const teamId = inviteData.teamId;

                const joinResult = await addMemberToTeam({
                    userId: user.uid,
                    teamId: teamId,
                    email: user.email,
                    ...updatedProfileData,
                });

                if (joinResult.success) {
                    finalTeamId = teamId;
                    toast({ title: "Welcome!", description: `You have successfully joined ${inviteData.teamName}.` });
                    
                    const teamDocRef = doc(db, 'teams', teamId);
                    const teamDoc = await getDoc(teamDocRef);
                    const leaderId = teamDoc.data()?.leader.uid;
                    if(leaderId) {
                        const notificationsCollectionRef = collection(db, 'notifications');
                        const newNotificationRef = doc(notificationsCollectionRef);
                        await setDoc(newNotificationRef, {
                            recipientUid: leaderId,
                            title: "New Member Joined!",
                            message: `${values.name} has joined your team, "${inviteData.teamName}".`,
                            read: false,
                            createdAt: new Date(),
                            link: '/leader'
                        });
                    }

                    // Set flag to indicate join was just completed to prevent loop
                    sessionStorage.setItem('justCompletedJoin', 'true');
                    sessionStorage.removeItem('inviteToken');
                } else {
                    toast({ title: "Could Not Join Team", description: joinResult.message, variant: "destructive" });
                    sessionStorage.removeItem('inviteToken');
                }
            } else {
                 toast({ title: "Invite Invalid", description: "The invitation link is no longer valid.", variant: "destructive" });
                 sessionStorage.removeItem('inviteToken');
            }
        }

        // Update the user's own profile document
        const userDocRef = doc(db, "users", user.uid);
        const dataToUpdate: Partial<UserProfile> = { ...updatedProfileData };
        if (finalTeamId) {
            dataToUpdate.teamId = finalTeamId;
        }

        await updateDoc(userDocRef, dataToUpdate);
        console.log(`User document updated: ${user.uid}`);
        
        toast({
            title: "Profile Updated!",
            description: "Redirecting to your dashboard.",
        });

        // Pass the updated user object to ensure redirection works correctly
        redirectToDashboard({ ...user, ...dataToUpdate });

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
            <p className="text-sm text-muted-foreground">Institute: <span className="font-medium">{teamInstitute || 'Loading...'}</span></p>
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || isDeptLoading || !teamInstitute}>
                              <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder={isDeptLoading ? "Loading..." : "Select your department"} />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {isDeptLoading ? (
                                      <div className="flex items-center justify-center p-2">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                      </div>
                                  ) : departments.length > 0 ? (
                                      <>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                        <SelectItem value="Other">Other</SelectItem>
                                      </>
                                  ) : (
                                    <SelectItem value="Other">Other</SelectItem>
                                  )}
                              </SelectContent>
                          </Select>
                          {selectedDepartment === 'Other' && (
                            <FormControl className="mt-2">
                                <Input placeholder="Please specify your department" {...field} disabled={isLoading}/>
                            </FormControl>
                          )}
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
                        value={field.value}
                        className="flex items-center space-x-4 pt-2"
                         disabled={isLoading}
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="M" />
                          </FormControl>
                          <FormLabel className="font-normal">Male</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="F" />
                          </FormControl>
                          <FormLabel className="font-normal">Female</FormLabel>
                        </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="O" />
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
              Save and Continue
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    