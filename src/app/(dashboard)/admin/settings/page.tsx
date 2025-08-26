
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const settingsSchema = z.object({
  registrationDeadline: z.date({
    required_error: "A registration deadline is required.",
  }),
  evaluationExportDate: z.date().optional(),
});


export default function EventSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    const fetchSettings = async () => {
        setIsFetching(true);
        try {
            const configDocRef = doc(db, "config", "event");
            const configDoc = await getDoc(configDocRef);
            if (configDoc.exists()) {
                const data = configDoc.data();
                const valuesToReset: any = {};
                if (data.registrationDeadline) {
                    valuesToReset.registrationDeadline = data.registrationDeadline.toDate();
                }
                 if (data.evaluationExportDate) {
                    valuesToReset.evaluationExportDate = data.evaluationExportDate.toDate();
                }
                form.reset(valuesToReset);
            }
        } catch (error) {
             toast({ title: "Error", description: "Could not fetch existing settings.", variant: "destructive" });
        } finally {
            setIsFetching(false);
        }
    };
    fetchSettings();
  }, [form, toast]);


  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    setIsLoading(true);
    try {
      const configDocRef = doc(db, "config", "event");
      const dataToSet: any = {
        registrationDeadline: values.registrationDeadline,
      };
      if (values.evaluationExportDate) {
        dataToSet.evaluationExportDate = values.evaluationExportDate;
      }
      await setDoc(configDocRef, dataToSet, { merge: true });

      toast({
        title: "Settings Saved",
        description: "The event settings have been updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Could not save settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Event Settings</h1>
        <p className="text-muted-foreground">Update global hackathon information.</p>
      </header>
      
      <Card>
         <CardHeader>
          <CardTitle>Global Dates</CardTitle>
          <CardDescription>Set important deadlines and dates for the entire event.</CardDescription>
        </CardHeader>
        <CardContent>
           {isFetching ? (
            <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin"/>
            </div>
           ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="registrationDeadline"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Registration Deadline</FormLabel>
                          <FormDescription>The final date and time for new user and team registrations.</FormDescription>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-[240px] pl-3 text-left font-normal mt-2",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP p")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                               <div className="p-2 border-t border-border">
                                  <Input
                                    type="time"
                                    onChange={(e) => {
                                      if (!field.value) return;
                                      const [hours, minutes] = e.target.value.split(':');
                                      const newDate = new Date(field.value);
                                      newDate.setHours(parseInt(hours, 10));
                                      newDate.setMinutes(parseInt(minutes, 10));
                                      field.onChange(newDate);
                                    }}
                                    value={field.value ? format(field.value, 'HH:mm') : ''}
                                  />
                                </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="evaluationExportDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Evaluation Export Enabled Date</FormLabel>
                          <FormDescription>The date after which SPOCs can see the "Export for Evaluation" button.</FormDescription>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-[240px] pl-3 text-left font-normal mt-2",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
             <Button type="submit" disabled={isLoading} className="mt-6">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Save All Settings
             </Button>
          </form>
          </Form>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
