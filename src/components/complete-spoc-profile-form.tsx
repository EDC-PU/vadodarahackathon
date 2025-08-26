
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
import { useState, useEffect } from "react";
import { Loader2, CheckCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { UserProfile } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notifyAdminsOfSpocRequest } from "@/ai/flows/notify-admins-flow";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  misId: z.string().min(1, { message: "MIS ID is required." }),
  gender: z.enum(["M", "F", "O"], { required_error: "Please select a gender." }),
  institute: z.string({ required_error: "Please select an institute." }).min(1, "Please select an institute."),
  department: z.string().min(2, { message: "Department is required." }),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
});

export function CompleteSpocProfileForm() {
  const { user, loading: authLoading, handleSignOut, reloadUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      institute: "",
      contactNumber: "",
      misId: "",
      department: "",
      gender: undefined,
    },
  });

  useEffect(() => {
    const q = collection(db, "institutes");
    const unsubscribe = onSnapshot(query(q, orderBy("name")), (querySnapshot) => {
      const institutesData = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setInstitutes(institutesData);
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
      if (user) {
          // If the user's profile already shows they are pending, immediately show the message.
          if (user.spocStatus === 'pending' && user.institute && user.misId) {
            setIsSubmitted(true);
          }
          form.reset({
              name: user.name || "",
              institute: user.institute || "",
              contactNumber: user.contactNumber || "",
              misId: user.misId || "",
              department: user.department || "",
              gender: user.gender || undefined,
          })
      }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
        return;
    }
    
    setIsLoading(true);
    try {
        console.log(`Checking for existing SPOC for institute: ${values.institute}`);
        const spocQuery = query(
            collection(db, 'users'),
            where('institute', '==', values.institute),
            where('role', '==', 'spoc'),
            where('spocStatus', '==', 'approved')
        );
        
        const existingSpocSnapshot = await getDocs(spocQuery);
        if (!existingSpocSnapshot.empty) {
            const isDifferentUser = existingSpocSnapshot.docs.some(doc => doc.id !== user.uid);
            if (isDifferentUser) {
              const errorMessage = `An approved SPOC for ${values.institute} already exists.`;
              console.error(errorMessage);
              toast({ title: "Registration Blocked", description: errorMessage, variant: "destructive" });
              setIsLoading(false);
              return;
            }
        }
        console.log(`No existing approved SPOC found for ${values.institute}. Proceeding...`);

        const userDocRef = doc(db, "users", user.uid);
        const updatedProfileData: Partial<UserProfile> = {
            name: values.name,
            misId: values.misId,
            gender: values.gender,
            institute: values.institute,
            department: values.department,
            contactNumber: values.contactNumber,
            spocStatus: 'pending', 
        };
        await updateDoc(userDocRef, updatedProfileData);

        await addDoc(collection(db, "logs"), {
            id: doc(collection(db, "logs")).id,
            title: "New SPOC Request",
            message: `${values.name} from ${values.institute} submitted a request to become a SPOC.`,
            createdAt: serverTimestamp(),
        });

        await notifyAdminsOfSpocRequest({
            spocName: values.name,
            spocEmail: user.email,
            spocInstitute: values.institute,
        });

        toast({ title: "Submitted!", description: "Your application is now pending approval." });
        setIsSubmitted(true); // This will trigger the UI change
        await reloadUser(); // This ensures the `useAuth` hook gets the latest user data with `spocStatus: pending`

    } catch (error: any) {
      console.error("SPOC Profile Update Error:", error);
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
  
  if (isSubmitted) {
      return (
        <div className="flex flex-col items-center text-center gap-4 animate-in fade-in-50 p-6">
            <Alert variant="default" className="border-green-500 text-left">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Application Submitted for Approval</AlertTitle>
                <AlertDescription>
                    Your profile details have been successfully submitted. An administrator will review your application. You will be notified via email once your account has been approved.
                </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
            </Button>
        </div>
      )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <p className="text-sm text-muted-foreground">Your email: <span className="font-medium">{user?.email}</span></p>
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
                    name="misId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>MIS ID</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter your MIS ID" {...field} disabled={isLoading}/>
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
            Submit for Approval
            </Button>
        </form>
        </Form>
      </CardContent>
    </Card>
  );
}
