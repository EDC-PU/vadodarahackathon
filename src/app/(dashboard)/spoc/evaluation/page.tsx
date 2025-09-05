
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
  FormMessage,
  FormLabel
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
import { doc, getDoc, updateDoc, writeBatch, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState, useMemo } from "react";
import { Institute, Team, UserProfile } from "@/lib/types";
import {
  Loader2,
  CalendarIcon,
  AlertCircle,
  Trophy,
  Users,
  Download,
  Cpu,
  Code,
  Search,
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setEvaluationDates } from "@/ai/flows/set-evaluation-dates-flow";
import { generateNominationForm } from "@/ai/flows/generate-nomination-form-flow";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  evaluationDates: z
    .array(z.date())
    .min(2, "Please select at least two dates.")
    .max(4, "You can select a maximum of four dates."),
});

// Helper to fetch user profiles in chunks to avoid Firestore 30-item 'in' query limit
async function getUserProfilesInChunks(userIds: string[]): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();
    if (userIds.length === 0) return userProfiles;

    const chunkSize = 30;
    for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        if (chunk.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => {
                userProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
            });
        }
    }
    return userProfiles;
}


export default function SpocEvaluationPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [instituteData, setInstituteData] = useState<Institute | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<Map<string, UserProfile>>(new Map());
  const [nominatedTeamIds, setNominatedTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const isPietSpoc = user?.institute === "Parul Institute of Engineering & Technology";

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
              data.evaluationDates.map((ts: any) => ts.toDate())
            );
          }
        }
        
        const teamsQuery = query(collection(db, "teams"), where("institute", "==", user.institute));
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setAllTeams(teamsData);
        setNominatedTeamIds(teamsData.filter(t => t.isNominated).map(t => t.id));

        const allUserIds = new Set<string>();
        teamsData.forEach(team => {
            allUserIds.add(team.leader.uid);
            team.members.forEach(member => member.uid && allUserIds.add(member.uid));
        });
        
        if(allUserIds.size > 0) {
            const usersData = await getUserProfilesInChunks(Array.from(allUserIds));
            setAllUsers(usersData);
        }

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

    if (isPietSpoc && data.evaluationDates.length > 4) {
      toast({ title: "Error", description: "You can select a maximum of four dates.", variant: "destructive" });
      return;
    }
    if (!isPietSpoc && data.evaluationDates.length > 2) {
      toast({ title: "Error", description: "You can select a maximum of two dates.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const result = await setEvaluationDates({
          instituteId: instituteData.id,
          dates: data.evaluationDates.map(d => d.toISOString())
      });

      if (result.success) {
        toast({ title: "Success", description: "Evaluation dates saved." });
        setInstituteData(prev => prev ? { ...prev, evaluationDates: data.evaluationDates.map(date => Timestamp.fromDate(date)) as any } : null);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Error saving dates:", error);
      toast({
        title: "Error",
        description: error.message || "Could not save dates.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const registeredTeams = useMemo(() => {
    return allTeams.filter(team => {
        const teamMemberProfiles = [team.leader, ...team.members].map(m => allUsers.get(m.uid)).filter(Boolean) as UserProfile[];
        const hasFemale = teamMemberProfiles.some(m => m.gender === 'F');
        const instituteCount = teamMemberProfiles.filter(m => m.institute === team.institute).length;

        const isRegistered = teamMemberProfiles.length === 6 && hasFemale && instituteCount >= 3 && !!team.problemStatementId;
        
        if (!isRegistered) return false;
        
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          return team.name.toLowerCase().includes(lowerSearch) || team.leader.name.toLowerCase().includes(lowerSearch) || team.teamNumber?.toLowerCase().includes(lowerSearch);
        }
        return true;
    });
  }, [allTeams, allUsers, searchTerm]);
  

  const nominationCounts = useMemo(() => {
    let software = 0;
    let hardware = 0;
    nominatedTeamIds.forEach(id => {
        const team = allTeams.find(t => t.id === id);
        if (team?.category === 'Software') software++;
        if (team?.category === 'Hardware') hardware++;
    });
    return { software, hardware };
  }, [nominatedTeamIds, allTeams]);
  
  const handleNominationChange = (teamId: string, teamCategory: "Software" | "Hardware" | undefined, checked: boolean | 'indeterminate') => {
    const softwareLimit = instituteData?.nominationLimitSoftware ?? 0;
    const hardwareLimit = instituteData?.nominationLimitHardware ?? 0;
    
    setNominatedTeamIds(currentIds => {
      const newIds = new Set(currentIds);
      if(checked) {
        if (teamCategory === 'Software' && nominationCounts.software >= softwareLimit) {
            toast({ title: "Limit Reached", description: `You can only nominate up to ${softwareLimit} software teams.`, variant: "destructive" });
            return Array.from(newIds);
        }
        if (teamCategory === 'Hardware' && nominationCounts.hardware >= hardwareLimit) {
            toast({ title: "Limit Reached", description: `You can only nominate up to ${hardwareLimit} hardware teams.`, variant: "destructive" });
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
      allTeams.forEach(team => {
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

  const handleGenerateForm = async (teamId: string) => {
    setIsGenerating(teamId);
    try {
        const result = await generateNominationForm({ teamId, generatorRole: 'spoc' });
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'nomination-form.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "Nomination form generated." });
        } else {
            toast({ title: "Generation Failed", description: result.message || "Could not generate the nomination form.", variant: "destructive" });
        }
    } catch (error: any) {
        toast({ title: "Error", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
    } finally {
        setIsGenerating(null);
    }
  };

  const canNominate = instituteData?.evaluationDates && instituteData.evaluationDates.length >= 2
    ? isAfter(new Date(), (instituteData.evaluationDates[1] as any).toDate())
    : false;
  
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
            {isPietSpoc
              ? "Select four dates your institute will hold its internal hackathon. These must be between September 1st and 10th, 2025."
              : "Select the two dates your institute will hold its internal hackathon. These must be between September 1st and 4th, 2025."}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal md:w-auto",
                              !field.value?.length && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value?.length > 0 ? (
                              field.value
                                .map((date) => format(date, "PPP"))
                                .join(" and ")
                            ) : (
                              <span>Pick your dates</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="multiple"
                          min={isPietSpoc ? 4 : 2}
                          max={isPietSpoc ? 4 : 2}
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          fromDate={new Date(2025, 8, 1)}
                          toDate={new Date(2025, 8, isPietSpoc ? 10 : 4)}
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
             Select from your registered teams to nominate for the University Level Hackathon. 
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
              <div className="flex justify-between items-center flex-wrap gap-4">
                 <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                    <p className="flex items-center gap-2">
                        <Code className="h-4 w-4 text-primary" />
                        Software: {nominationCounts.software} / {instituteData?.nominationLimitSoftware ?? 0}
                    </p>
                    <p className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-accent" />
                        Hardware: {nominationCounts.hardware} / {instituteData?.nominationLimitHardware ?? 0}
                    </p>
                 </div>
                 <Button onClick={handleSaveNominations} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Nominations
                </Button>
              </div>

               <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by team name or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full max-w-sm"
                />
              </div>
              
              <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Team Number</TableHead>
                            <TableHead>Leader</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Form</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {registeredTeams.length > 0 ? registeredTeams.map(team => (
                        <TableRow key={team.id}>
                            <TableCell>
                                <Checkbox 
                                    id={`team-${team.id}`} 
                                    onCheckedChange={(checked) => handleNominationChange(team.id, team.category, checked)}
                                    checked={nominatedTeamIds.includes(team.id)}
                                    disabled={
                                        (!nominatedTeamIds.includes(team.id) && team.category === 'Software' && nominationCounts.software >= (instituteData?.nominationLimitSoftware ?? 0)) ||
                                        (!nominatedTeamIds.includes(team.id) && team.category === 'Hardware' && nominationCounts.hardware >= (instituteData?.nominationLimitHardware ?? 0)) ||
                                        !team.category
                                    }
                                />
                            </TableCell>
                            <TableCell className="font-medium">{team.name}</TableCell>
                            <TableCell>{team.teamNumber || "N/A"}</TableCell>
                            <TableCell>{team.leader.name}</TableCell>
                            <TableCell>
                                {team.category && <Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>{team.category}</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                                {nominatedTeamIds.includes(team.id) && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateForm(team.id)}
                                    disabled={isGenerating === team.id}
                                >
                                    {isGenerating === team.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                    Generate
                                </Button>
                                )}
                            </TableCell>
                        </TableRow>
                        )) : (
                           <TableRow>
                               <TableCell colSpan={6} className="h-24 text-center">
                                   No registered teams found matching your search.
                               </TableCell>
                           </TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
