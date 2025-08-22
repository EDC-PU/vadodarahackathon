
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { Team, UserProfile } from "@/lib/types";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Please select a gender." }),
  department: z.string().min(2, { message: "Department is required." }),
  enrollmentNumber: z.string().min(5, { message: "Enrollment number is required." }),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
});

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();
  const params = useParams();
  const profileEnrollmentNumber = params.id as string;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: "",
        gender: undefined,
        department: "",
        enrollmentNumber: "",
        contactNumber: "",
    },
  });
  
  useEffect(() => {
    const fetchProfileData = async () => {
        if (!profileEnrollmentNumber) return;
        setIsFetching(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("enrollmentNumber", "==", profileEnrollmentNumber));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const data = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
                setProfileData(data);
                form.reset({
                    name: data.name || "",
                    gender: data.gender || undefined,
                    department: data.department || "",
                    enrollmentNumber: data.enrollmentNumber || "",
                    contactNumber: data.contactNumber || "",
                });
            }
        } catch (err) {
             toast({ title: "Error", description: "Failed to fetch profile data.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchProfileData();
  }, [profileEnrollmentNumber, form, toast]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !profileData || user.uid !== profileData.uid) {
        toast({ title: "Error", description: "You can only edit your own profile.", variant: "destructive" });
        return;
    }
    
    setIsLoading(true);
    try {
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

        // 2. If user is a member or leader of a team, update their details in the team document
        if (user.teamId) {
            const teamDocRef = doc(db, "teams", user.teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (teamDoc.exists()) {
                const teamData = teamDoc.data() as Team;
                if (user.role === 'leader') {
                     batch.update(teamDocRef, { 'leader.name': values.name });
                } else {
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
                    }
                }
            }
        }
        
        await batch.commit();

        toast({
            title: "Profile Updated!",
            description: "Your details have been successfully saved.",
        });
        
        // If enrollment number was changed, we might need to redirect
        if (profileEnrollmentNumber !== values.enrollmentNumber) {
            window.location.href = `/profile/${values.enrollmentNumber}`;
        }

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

  if (authLoading || isFetching) {
      return (
          <div className="flex justify-center items-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }
  
  if (!user || user.enrollmentNumber !== profileEnrollmentNumber) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>You can only view and edit your own profile.</AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline">My Profile</h1>
            <p className="text-muted-foreground">View and edit your personal information.</p>
        </header>
        <Card>
            <CardHeader>
                <CardTitle>Edit Your Details</CardTitle>
                <CardDescription>
                    Your email address is <span className="font-medium">{user.email}</span>. Your institute is <span className="font-medium">{user.institute}</span>.
                </CardDescription>
            </CardHeader>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    
                    <Button type="submit" disabled={isLoading || authLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
