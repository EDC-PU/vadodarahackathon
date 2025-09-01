
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Institute } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { setStudentCoordinator } from "@/ai/flows/set-student-coordinator-flow";

const formSchema = z.object({
  studentCoordinatorName: z.string().min(2, "Name is required."),
  studentCoordinatorContact: z.string().regex(/^\d{10}$/, "Please enter a valid 10-digit phone number."),
});

export default function SpocSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [instituteData, setInstituteData] = useState<Institute | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentCoordinatorName: "",
      studentCoordinatorContact: "",
    },
  });

  useEffect(() => {
    if (!user?.institute) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "institutes"), where("name", "==", user.institute));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Institute;
        setInstituteData(data);
        form.reset({
          studentCoordinatorName: data.studentCoordinatorName || "",
          studentCoordinatorContact: data.studentCoordinatorContact || "",
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.institute, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!instituteData) return;

    setIsSaving(true);
    try {
      const result = await setStudentCoordinator({
        instituteId: instituteData.id,
        ...data,
      });

      if (result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Could not save settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline">
          Institute Settings
        </h1>
        <p className="text-muted-foreground">
          Manage settings and contacts for your institute, {user?.institute}.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Student Coordinator</CardTitle>
          <CardDescription>
            Provide the details for the student coordinator of your institute. This will be visible to team leaders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="studentCoordinatorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coordinator's Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="studentCoordinatorContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coordinator's Contact No.</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter 10-digit number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Coordinator Details
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
