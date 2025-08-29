
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, query, where, onSnapshot, writeBatch } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { UserProfile, Team } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["M", "F", "O"], { required_error: "Please select a gender." }),
  department: z.string({ required_error: "Please select or enter a department." }).min(1, "Please select or enter a department."),
  enrollmentNumber: z.string().min(5, { message: "Enrollment number is required." }),
  semester: z.coerce.number({invalid_type_error: "Semester is required."}).min(1, { message: "Semester must be between 1 and 10." }).max(10, { message: "Semester must be between 1 and 10." }),
  yearOfStudy: z.string().min(1, "Year must be between 1 and 5."),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
});

export default function ProfilePage() {
    const { user: authUser, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [departments, setDepartments] = useState<string[]>([]);
    const [isDeptLoading, setIsDeptLoading] = useState(false);
    const params = useParams();
    const { toast } = useToast();

    const enrollmentId = params.id as string;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const selectedDepartment = useWatch({
        control: form.control,
        name: 'department'
    });

    const canEdit = authUser?.role === 'admin' || authUser?.enrollmentNumber === enrollmentId;

    useEffect(() => {
        if (!enrollmentId) return;
        setLoading(true);
        const q = query(collection(db, "users"), where("enrollmentNumber", "==", enrollmentId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const userData = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
                setProfile(userData);
                form.reset({
                    ...userData,
                    yearOfStudy: userData.yearOfStudy?.toString() ?? "",
                });
            } else {
                setProfile(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching profile:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [enrollmentId, form]);

    useEffect(() => {
        if (!profile?.institute) return;

        setIsDeptLoading(true);
        const deptDocRef = doc(db, "departments", profile.institute);
        const unsubscribe = onSnapshot(deptDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setDepartments(docSnap.data().departments?.sort() || []);
            } else {
                setDepartments([]);
            }
            setIsDeptLoading(false);
        });
        return () => unsubscribe();
    }, [profile?.institute]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!profile || !canEdit) {
            toast({ title: "Error", description: "You are not authorized to perform this action.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        const batch = writeBatch(db);

        try {
            // 1. Update the user's own profile document
            const userDocRef = doc(db, "users", profile.uid);
            batch.update(userDocRef, values);
            console.log(`Profile page: Updated user document for ${profile.uid}`);

            // 2. If the user is in a team, update their details in the team document
            if (profile.teamId) {
                const teamDocRef = doc(db, "teams", profile.teamId);
                const teamDoc = await getDoc(teamDocRef);

                if (teamDoc.exists()) {
                    const teamData = teamDoc.data() as Team;
                    let updated = false;

                    if (teamData.leader.uid === profile.uid) {
                        // Update leader details
                        teamData.leader.name = values.name;
                        teamData.leader.email = profile.email; // email is not editable on this form
                        updated = true;
                    } else {
                        // Update member details
                        const memberIndex = teamData.members.findIndex(m => m.uid === profile.uid);
                        if (memberIndex > -1) {
                            teamData.members[memberIndex] = {
                                ...teamData.members[memberIndex],
                                ...values,
                                uid: profile.uid,
                                email: profile.email
                            };
                            updated = true;
                        }
                    }

                    if (updated) {
                       batch.update(teamDocRef, { leader: teamData.leader, members: teamData.members });
                       console.log(`Profile page: Updated team document ${profile.teamId} with new details for user ${profile.uid}`);
                    }
                }
            }

            await batch.commit();
            toast({ title: "Success!", description: "Profile has been updated successfully." });
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
    
    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!profile) {
        return (
             <div className="p-4 sm:p-6 lg:p-8">
                <p>Profile not found for enrollment ID: {enrollmentId}</p>
             </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>User Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><p className="text-sm font-medium">Email</p><p className="text-muted-foreground">{profile.email}</p></div>
                                <div><p className="text-sm font-medium">Institute</p><p className="text-muted-foreground">{profile.institute}</p></div>
                            </div>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!canEdit || isLoading} />
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
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4 pt-2" disabled={!canEdit || isLoading}>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="M" /></FormControl><FormLabel className="font-normal">Male</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="F" /></FormControl><FormLabel className="font-normal">Female</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="O" /></FormControl><FormLabel className="font-normal">Other</FormLabel></FormItem>
                                            </RadioGroup>
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
                                         <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit || isLoading || isDeptLoading}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder={isDeptLoading ? "Loading..." : "Select department"} /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments.map((dept) => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {(selectedDepartment === 'Other' || (field.value && !departments.includes(field.value))) && (
                                            <FormControl className="mt-2">
                                                <Input placeholder="Please specify your department" {...field} disabled={!canEdit || isLoading} />
                                            </FormControl>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="enrollmentNumber" render={({ field }) => (<FormItem><FormLabel>Enrollment No.</FormLabel><FormControl><Input {...field} disabled={!canEdit || isLoading} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="semester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit || isLoading} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="yearOfStudy" render={({ field }) => (<FormItem><FormLabel>Year of Study</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit || isLoading} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="contactNumber" render={({ field }) => (<FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} disabled={!canEdit || isLoading} /></FormControl><FormMessage /></FormItem>)} />
                            {canEdit && <Button type="submit" className="w-full" disabled={isLoading}><Loader2 className={cn("mr-2 h-4 w-4", !isLoading && "hidden")} />Save Changes</Button>}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
