

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, collection, query, where, onSnapshot, writeBatch, orderBy } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { UserProfile, Team, Institute } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["M", "F", "O"], { required_error: "Please select a gender." }),
  institute: z.string().min(1, "Please select an institute."),
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [isDeptLoading, setIsDeptLoading] = useState(false);
    const params = useParams();
    const { toast } = useToast();

    const enrollmentId = params.id as string;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            gender: undefined,
            institute: "",
            department: "",
            enrollmentNumber: "",
            semester: undefined,
            yearOfStudy: "",
            contactNumber: "",
        }
    });
    
    const selectedInstitute = useWatch({ control: form.control, name: 'institute' });
    const departmentFieldValue = useWatch({ control: form.control, name: 'department' });

    const canEdit = authUser?.role === 'admin' || 
                    authUser?.enrollmentNumber === enrollmentId || 
                    (authUser?.role === 'spoc' && authUser.institute === profile?.institute);

    // Fetch Institutes List
    useEffect(() => {
      const q = query(collection(db, "institutes"), orderBy("name"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institute));
          setInstitutes(data);
      });
      return () => unsubscribe();
    }, []);

    // Fetch User Profile
    useEffect(() => {
        if (!enrollmentId) {
            setLoading(false);
            return;
        }
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
            toast({title: "Error", description: "Could not fetch profile.", variant: "destructive"});
            setLoading(false);
        });
        return () => unsubscribe();
    }, [enrollmentId, form, toast]);

    // Fetch Departments based on selected Institute
    useEffect(() => {
        if (!selectedInstitute) {
            setDepartments([]);
            return
        };

        setIsDeptLoading(true);
        const deptDocRef = doc(db, "departments", selectedInstitute);
        const unsubscribe = onSnapshot(deptDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const departmentsData = docSnap.data().departments?.sort() || [];
                setDepartments(departmentsData);
            } else {
                setDepartments([]);
            }
            setIsDeptLoading(false);
        }, (error) => {
            console.error("Error fetching departments:", error);
            setIsDeptLoading(false);
        });
        return () => unsubscribe();
    }, [selectedInstitute]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!profile || !canEdit) {
            toast({ title: "Error", description: "You are not authorized to perform this action.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const batch = writeBatch(db);

        try {
            // 1. Update the user's own profile document
            const userDocRef = doc(db, "users", profile.uid);
            batch.update(userDocRef, values);

            // 2. If the user is in a team, update their details in the team document
            if (profile.teamId) {
                const teamDocRef = doc(db, "teams", profile.teamId);
                const teamDoc = await getDoc(teamDocRef);

                if (teamDoc.exists()) {
                    const teamData = teamDoc.data() as Team;
                    let updated = false;

                    if (teamData.leader.uid === profile.uid) {
                        teamData.leader.name = values.name;
                        // Also update team's top-level institute if leader changes theirs
                        teamData.institute = values.institute;
                        updated = true;
                    } else {
                        const memberIndex = teamData.members.findIndex(m => m.uid === profile.uid);
                        if (memberIndex > -1) {
                            teamData.members[memberIndex] = {
                                ...teamData.members[memberIndex],
                                name: values.name,
                                gender: values.gender,
                                enrollmentNumber: values.enrollmentNumber,
                                contactNumber: values.contactNumber,
                                semester: values.semester,
                                yearOfStudy: values.yearOfStudy,
                            };
                            updated = true;
                        }
                    }

                    if (updated) {
                       batch.update(teamDocRef, { leader: teamData.leader, members: teamData.members, institute: teamData.institute });
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
            setIsSubmitting(false);
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
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Profile Not Found</AlertTitle>
                    <AlertDescription>No user profile could be found for enrollment ID: {enrollmentId}</AlertDescription>
                </Alert>
             </div>
        )
    }

    const showOtherDepartmentInput = useMemo(() => {
        if (!departmentFieldValue) return false;
        return !departments.includes(departmentFieldValue);
    }, [departmentFieldValue, departments]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>User Profile</CardTitle>
                    <CardDescription>View and edit the user's profile information. Read-only fields cannot be changed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md bg-secondary/30">
                                <div><p className="text-sm font-medium">Email</p><p className="text-muted-foreground">{profile.email}</p></div>
                                <div><p className="text-sm font-medium">Role</p><p className="text-muted-foreground capitalize">{profile.role}</p></div>
                            </div>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!canEdit || isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="institute"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Institute</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit || isSubmitting}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an institute" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {institutes.map(inst => (
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
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gender</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4 pt-2" disabled={!canEdit || isSubmitting}>
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
                                        <Select 
                                            onValueChange={(value) => field.onChange(value === 'Other' ? '' : value)} 
                                            value={showOtherDepartmentInput ? 'Other' : field.value} 
                                            disabled={!canEdit || isSubmitting || isDeptLoading}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={isDeptLoading ? "Loading..." : "Select department"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {departments.map((dept) => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {showOtherDepartmentInput && (
                                            <FormControl className="mt-2">
                                                <Input placeholder="Please specify your department" {...field} disabled={!canEdit || isSubmitting} />
                                            </FormControl>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="enrollmentNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Enrollment No.</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={true} />
                                    </FormControl>
                                    <FormDescription>
                                        If you want to change your enrollment number, please contact organisers: <a href="mailto:programs.pierc@paruluniversity.ac.in" className="underline text-primary">programs.pierc@paruluniversity.ac.in</a>.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>)} 
                                />
                                <FormField control={form.control} name="semester" render={({ field }) => (<FormItem><FormLabel>Semester</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit || isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="yearOfStudy" render={({ field }) => (<FormItem><FormLabel>Year of Study</FormLabel><FormControl><Input type="number" {...field} disabled={!canEdit || isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={form.control} name="contactNumber" render={({ field }) => (<FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} disabled={!canEdit || isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                            
                            {canEdit && 
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Save Changes
                                </Button>
                            }
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
