
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Institute, Team } from "@/lib/types";
import {
  Loader2,
  CalendarIcon,
  AlertCircle,
  Trophy,
  Users,
} from "lucide-react";
import { format, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  evaluationDates: z
    .array(z.date())
    .min(2, "Please select exactly two dates.")
    .max(2, "Please select exactly two dates."),
});

export default function SpocEvaluationPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [instituteData, setInstituteData] = useState<Institute | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [nominatedTeamIds, setNominatedTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      evaluationDates: [],
    },
  });

  useEffect(() => {
    if (!user?.institute) {
      setLoading(false);
      return;
    }
    const fetchInstituteData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "institutes"), where("name", "==", user.institute));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const instituteDoc = querySnapshot.docs[0];
          const data = { id: instituteDoc.id, ...instituteDoc.data() } as Institute;
          setInstituteData(data);
          if (data.evaluationDates) {
            form.setValue(
              "evaluationDates",
              data.evaluationDates.map((ts) => ts.toDate())
            );
          }
        }
        
        // Fetch teams for nomination
        const teamsQuery = query(collection(db, "teams"), where("institute", "==", user.institute));
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsData);
        setNominatedTeamIds(teamsData.filter(t => t.isNominated).map(t => t.id));

      } catch (error) {
        console.error("Error fetching institute data:", error);
        toast({
          title: "Error",
          description: "Could not load institute settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchInstituteData();
  }, [user?.institute, form, toast]);

  const onDateSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!instituteData) return;
    setIsSaving(true);
    try {
      const instituteRef = doc(db, "institutes", instituteData.id);
      await updateDoc(instituteRef, {
        evaluationDates: data.evaluationDates,
      });
      toast({ title: "Success", description: "Evaluation dates saved." });
      setInstituteData((prev) =>
        prev ? { ...prev, evaluationDates: data.evaluationDates as any } : null
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save dates.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleNominationChange = (teamId: string, checked: boolean | 'indeterminate') => {
    const limit = instituteData?.nominationLimit ?? 0;
    
    setNominatedTeamIds(currentIds => {
      const newIds = new Set(currentIds);
      if(checked) {
        if (newIds.size >= limit) {
           toast({ title: "Limit Reached", description: `You can only nominate up to ${limit} teams.`, variant: "destructive" });
           return Array.from(newIds);
        }
        newIds.add(teamId);
      } else {
        newIds.delete(teamId);
      }
      return Array.from(newIds);
    });
  }

  const handleSaveNominations = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      teams.forEach(team => {
        const teamRef = doc(db, 'teams', team.id);
        const shouldBeNominated = nominatedTeamIds.includes(team.id);
        if (team.isNominated !== shouldBeNominated) {
           batch.update(teamRef, { isNominated: shouldBeNominated });
        }
      });
      await batch.commit();
      toast({ title: "Success", description: "Nominations have been saved." });
    } catch (error) {
       toast({ title: "Error", description: "Could not save nominations.", variant: "destructive" });
    } finally {
       setIsSaving(false);
    }
  }

  const canNominate = instituteData?.evaluationDates && instituteData.evaluationDates.length === 2
    ? isAfter(new Date(), instituteData.evaluationDates[1].toDate())
    : false;

  const nominationLimit = instituteData?.nominationLimit ?? 0;

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
          Evaluation & Nomination
        </h1>
        <p className="text-muted-foreground">
          Set your institute's hackathon dates and nominate teams for the next
          round.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Set Institute Hackathon Dates</CardTitle>
          <CardDescription>
            Select the two dates your institute will hold its internal hackathon.
            These must be between September 1st and 4th, 2025.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onDateSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="evaluationDates"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Evaluation Dates</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full md:w-auto md:max-w-md justify-start text-left font-normal",
                              !field.value?.length && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value?.length > 0 ? (
                              field.value
                                .map((date) => format(date, "PPP"))
                                .join(" and ")
                            ) : (
                              <span>Pick your two dates</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="multiple"
                          min={2}
                          max={2}
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          fromDate={new Date(2025, 8, 1)}
                          toDate={new Date(2025, 8, 4)}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Dates
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy /> Team Nominations
          </CardTitle>
          <CardDescription>
            Select teams from your institute to nominate for the University Level Hackathon. 
            You can nominate up to <span className="font-bold text-primary">{nominationLimit}</span> team(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canNominate ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nominations are Closed</AlertTitle>
              <AlertDescription>
                You can nominate teams after your selected evaluation dates have
                passed. Please set your dates first.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <p className="text-sm font-medium">
                    Selected: {nominatedTeamIds.length} / {nominationLimit}
                </p>
                 <Button onClick={handleSaveNominations} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Nominations
                </Button>
              </div>
              <div className="border rounded-md">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center p-4 border-b last:border-b-0">
                     <Checkbox 
                        id={`team-${team.id}`} 
                        onCheckedChange={(checked) => handleNominationChange(team.id, checked)}
                        checked={nominatedTeamIds.includes(team.id)}
                        disabled={!nominatedTeamIds.includes(team.id) && nominatedTeamIds.length >= nominationLimit}
                    />
                    <label htmlFor={`team-${team.id}`} className="ml-4 flex-1">
                      <p className="font-semibold">{team.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" /> {team.members.length + 1} members
                      </p>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
