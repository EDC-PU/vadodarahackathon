
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
import { useState } from "react";
import { Chrome, Loader2 } from "lucide-react";
import { INSTITUTES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { SmartFieldTip } from "./smart-field-tip";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { doc, setDoc, writeBatch, getDoc, collection } from "firebase/firestore";
import { Separator } from "./ui/separator";
import { UserProfile } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  teamName: z.string().min(3, { message: "Team name must be at least 3 characters." }),
  category: z.enum(["Software", "Hardware"], { required_error: "Please select a category." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Please select a gender." }),
  institute: z.string({ required_error: "Please select an institute." }),
  department: z.string().min(2, { message: "Department is required." }),
  enrollmentNumber: z.string().min(5, { message: "Enrollment number is required." }),
  semester: z.coerce.number({invalid_type_error: "Semester is required."}).min(1, { message: "Semester must be between 1 and 8." }).max(8, { message: "Semester must be between 1 and 8." }),
  yearOfStudy: z.string().min(1, { message: "Year of study is required." }),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const { handleLogin } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: "",
      name: "",
      department: "",
      enrollmentNumber: "",
      yearOfStudy: "",
      contactNumber: "",
      email: "",
      password: "",
    },
  });
  
  const createFirestoreData = async (user: User, values: z.infer<typeof formSchema>) => {
    const batch = writeBatch(db);

    const isPanavAdmin = values.email.toLowerCase() === "pranavrathi07@gmail.com";
    const role = isPanavAdmin ? "admin" : "leader";

    // For admins, we don't create a team, just a user profile.
    if (role === 'admin') {
        const userProfile: UserProfile = {
            uid: user.uid,
            name: values.name,
            email: user.email!,
            role: "admin",
            photoURL: user.photoURL || '',
            institute: values.institute,
            department: values.department,
            enrollmentNumber: values.enrollmentNumber,
            contactNumber: values.contactNumber,
            gender: values.gender as "Male" | "Female" | "Other",
        };
        const userDocRef = doc(db, "users", user.uid);
        batch.set(userDocRef, userProfile);
        await batch.commit();
        return userProfile;
    }


    // 1. Create Team for leaders
    const teamDocRef = doc(collection(db, "teams"));
    const teamData = {
      id: teamDocRef.id,
      name: values.teamName,
      leader: {
          uid: user.uid,
          name: values.name,
          email: values.email,
      },
      institute: values.institute,
      department: values.department,
      category: values.category as "Software" | "Hardware",
      members: [], // Start with empty members array
    };
    batch.set(teamDocRef, teamData);

    // 2. Create User Profile for leaders
    const userProfile: UserProfile = {
      uid: user.uid,
      name: values.name,
      email: user.email!,
      role: "leader",
      photoURL: user.photoURL || '',
      institute: values.institute,
      department: values.department,
      enrollmentNumber: values.enrollmentNumber,
      contactNumber: values.contactNumber,
      gender: values.gender as "Male" | "Female" | "Other",
      teamId: teamDocRef.id, // Link user to team
    };
    const userDocRef = doc(db, "users", user.uid);
    batch.set(userDocRef, userProfile);
    
    await batch.commit();
    return userProfile;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await createFirestoreData(userCredential.user, values);
      await handleLogin(userCredential.user);
    } catch (error: any) {
      console.error("Registration Error:", error);
      let errorMessage = "An unexpected error occurred.";
       if (error.code === 'auth/email-already-in-use') {
          errorMessage = "This email is already registered. Please login instead.";
       } else {
          errorMessage = error.message;
       }
       toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    // 1. Validate form first
    const isValid = await form.trigger(["teamName", "category", "name", "gender", "institute", "department", "enrollmentNumber", "semester", "yearOfStudy", "contactNumber"]);
    if (!isValid) {
      toast({
        title: "Incomplete Form",
        description: "Please fill out all your team and personal details before signing up with Google.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
         toast({ title: "Account Exists", description: "You're already registered. Redirecting..." });
         await handleLogin(user);
         return;
      }
      
      const formValues = form.getValues();
      // Use the email from Google, but the rest from the form
      const valuesWithGoogleEmail = { ...formValues, email: user.email! };
      await createFirestoreData(user, valuesWithGoogleEmail);
      
      await handleLogin(user);

    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        title: "Google Sign-In Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }
  
  const formDescription = "This is a registration form for the Vadodara Hackathon 6.0. Team leaders should fill out their personal and academic details to create their account and team.";

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Team Details</h3>
                <Separator />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                       <div className="flex items-center gap-2">
                          <Input placeholder="e.g., Tech Titans" {...field} disabled={isLoading || isGoogleLoading}/>
                          <SmartFieldTip fieldName="Team Name" formContext={formDescription} />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                     <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4 pt-2"
                           disabled={isLoading || isGoogleLoading}
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Software" />
                            </FormControl>
                            <FormLabel className="font-normal">Software</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="Hardware" />
                            </FormControl>
                            <FormLabel className="font-normal">Hardware</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-2 pt-4">
                <h3 className="text-lg font-medium">Team Leader&apos;s Details</h3>
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
                      <div className="flex items-center gap-2">
                        <Input placeholder="John Doe" {...field} disabled={isLoading || isGoogleLoading}/>
                        <SmartFieldTip fieldName="Team Leader Name" formContext={formDescription} />
                      </div>
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
                    <FormLabel>Email (for manual login)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input placeholder="leader@example.com" {...field} disabled={isLoading || isGoogleLoading}/>
                        <SmartFieldTip fieldName="Email" formContext={formDescription} />
                      </div>
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
                         disabled={isLoading || isGoogleLoading}
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
                name="institute"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institute</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isGoogleLoading}>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <SelectTrigger>
                            <SelectValue placeholder="Select your institute" />
                          </SelectTrigger>
                          <SmartFieldTip fieldName="Institute" formContext={formDescription} />
                        </div>
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
                      <div className="flex items-center gap-2">
                        <Input placeholder="e.g., Computer Engineering" {...field} disabled={isLoading || isGoogleLoading}/>
                        <SmartFieldTip fieldName="Department" formContext={formDescription} />
                      </div>
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
                      <Input placeholder="20030310XXXX" {...field} disabled={isLoading || isGoogleLoading}/>
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
                      <Input type="number" placeholder="e.g., 6" {...field} disabled={isLoading || isGoogleLoading}/>
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
                      <Input type="number" placeholder="e.g., 3" {...field} disabled={isLoading || isGoogleLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} disabled={isLoading || isGoogleLoading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (for manual login)</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="password" placeholder="••••••••" {...field} disabled={isLoading || isGoogleLoading}/>
                        <SmartFieldTip fieldName="Password" formContext={formDescription} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account with Email
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR</span>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Chrome className="mr-2 h-4 w-4" />
            )}
           Sign up with Google
        </Button>
      </CardContent>
    </Card>
  );
}

    