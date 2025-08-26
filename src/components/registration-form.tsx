
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SmartFieldTip } from "./smart-field-tip";
import { Separator } from "./ui/separator";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useAuth } from "@/hooks/use-auth";
import { createTeam, CreateTeamInput } from "@/ai/flows/create-team-flow";
import { suggestTeamName } from "@/ai/flows/suggest-team-name-flow";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, onSnapshot, query, orderBy } from "firebase/firestore";

const formSchema = z.object({
  teamName: z.string().min(3, { message: "Team name must be at least 3 characters." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  gender: z.enum(["M", "F", "O"], { required_error: "Please select a gender." }),
  institute: z.string({ required_error: "Please select an institute." }),
  department: z.string({ required_error: "Please select or enter a department." }).min(1, "Please select or enter a department."),
  enrollmentNumber: z.string().min(5, { message: "Enrollment number is required." }),
  semester: z.coerce.number({invalid_type_error: "Semester is required."}).min(1, { message: "Semester must be between 1 and 10." }).max(10, { message: "Semester must be between 1 and 10." }),
  yearOfStudy: z.coerce.number({invalid_type_error: "Year of study is required."}).min(1, "Year must be between 1 and 5.").max(5, "Year must be between 1 and 5.").transform(val => val.toString()),
  contactNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
});

export function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading, reloadUser } = useAuth();
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>("e.g., Tech Titans");
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(true);
  const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isDeptLoading, setIsDeptLoading] = useState(false);

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

  const selectedInstitute = useWatch({
    control: form.control,
    name: "institute",
  });
  
  const selectedDepartment = useWatch({
    control: form.control,
    name: 'department'
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
    const fetchDepartments = async () => {
        if (!selectedInstitute) {
            setDepartments([]);
            return;
        }
        setIsDeptLoading(true);
        try {
            const deptDocRef = doc(db, "departments", selectedInstitute);
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
  }, [selectedInstitute]);


  const fetchNameSuggestions = useCallback(async () => {
    setIsSuggestionLoading(true);
    try {
        const result = await suggestTeamName();
        if (result.success && result.suggestions) {
            setNameSuggestions(result.suggestions);
            setCurrentSuggestion(result.suggestions[0] || "e.g., Tech Titans");
        }
    } catch (error) {
        console.error("Failed to fetch team name suggestions:", error);
        setCurrentSuggestion("e.g., Tech Titans"); // Fallback
    } finally {
        setIsSuggestionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNameSuggestions();
  }, [fetchNameSuggestions]);

  const cycleSuggestion = () => {
      if (nameSuggestions.length > 0) {
        const currentIndex = nameSuggestions.indexOf(currentSuggestion);
        const nextIndex = (currentIndex + 1) % nameSuggestions.length;
        setCurrentSuggestion(nameSuggestions[nextIndex]);
      } else {
        fetchNameSuggestions();
      }
  };

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
  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("RegistrationForm onSubmit triggered.");
    if (!user) {
        toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
        return;
    }
    
    setIsLoading(true);
    try {
      const input: CreateTeamInput = {
          leaderUid: user.uid,
          leaderEmail: user.email,
          ...values,
      };
      
      const result = await createTeam(input);

      if (result.success) {
        toast({
          title: "Team Registered!",
          description: `Your team "${values.teamName}" has been successfully created.`,
        });
        console.log("Team registration successful, reloading user to trigger redirect...");
        await reloadUser();
      } else {
        toast({
            title: "Registration Failed",
            description: result.message || "An unexpected error occurred.",
            variant: "destructive",
        });
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
                        <Input placeholder={currentSuggestion} {...field} disabled={isLoading}/>
                         <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={cycleSuggestion}
                            disabled={isSuggestionLoading}
                            className="shrink-0 h-9 w-9 text-muted-foreground"
                         >
                            {isSuggestionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin"/>
                            ) : (
                                <RefreshCw className="h-4 w-4"/>
                            )}
                         </Button>
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
                          <Select onValueChange={(value) => field.onChange(value === 'Other' ? '' : value)} value={field.value && departments.includes(field.value) ? field.value : 'Other'}>
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
                          {(selectedDepartment === '' || !departments.includes(selectedDepartment)) && (
                              <FormControl className="mt-2">
                                  <Input placeholder="Please specify your department" {...field} disabled={isLoading} />
                              </FormControl>
                          )}
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
                      <Input type="number" placeholder="e.g., 3" {...field} />
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
              Create Team &amp; Finish Registration
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
