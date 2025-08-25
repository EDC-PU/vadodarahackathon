
"use client";

import { useEffect, useState, useRef } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Pie, PieChart, Cell, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Team, UserProfile, ProblemStatement } from "@/lib/types";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstituteChartData {
  institute: string;
  teams: number;
}

interface CategoryChartData {
  category: string;
  teams: number;
}

interface GenderChartData {
  gender: string;
  value: number;
  fill: string;
}

interface TeamStatusChartData {
  status: 'Registered' | 'Pending';
  count: number;
  fill: string;
}

interface ProblemStatementChartData {
    psId: string;
    count: number;
}

export default function AnalyticsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const teamsCollection = collection(db, 'teams');
    const unsubscribeTeams = onSnapshot(teamsCollection, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
    }, (error) => {
      console.error("Error fetching teams:", error);
      toast({ title: "Error", description: "Failed to fetch team data for analytics.", variant: "destructive" });
    });

    const usersCollection = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setUsers(usersData);
    }, (error) => {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Failed to fetch user data for analytics.", variant: "destructive" });
    });

    const psCollection = collection(db, 'problemStatements');
    const unsubscribePs = onSnapshot(psCollection, (snapshot) => {
        const psData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
        setProblemStatements(psData);
    });
    
    // Use a promise to wait for the initial fetch of all collections
    Promise.all([
        new Promise(resolve => onSnapshot(teamsCollection, () => resolve(true), () => resolve(false))),
        new Promise(resolve => onSnapshot(usersCollection, () => resolve(true), () => resolve(false))),
        new Promise(resolve => onSnapshot(psCollection, () => resolve(true), () => resolve(false))),
    ]).finally(() => setLoading(false));

    return () => {
      unsubscribeTeams();
      unsubscribeUsers();
      unsubscribePs();
    };
  }, [toast]);
  
  const getInstituteData = (): InstituteChartData[] => {
    const instituteCounts: { [key: string]: number } = {};
    teams.forEach(team => {
      instituteCounts[team.institute] = (instituteCounts[team.institute] || 0) + 1;
    });
    return Object.entries(instituteCounts).map(([institute, count]) => ({
      institute,
      teams: count,
    })).sort((a, b) => b.teams - a.teams);
  };
  
  const getCategoryData = (): CategoryChartData[] => {
    const categoryCounts: { [key: string]: number } = {};
    teams.forEach(team => {
      if (team.category) {
        categoryCounts[team.category] = (categoryCounts[team.category] || 0) + 1;
      }
    });
    return Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      teams: count,
    }));
  };

  const getGenderData = (): GenderChartData[] => {
    const registeredTeams = teams.filter(team => {
      const members = [team.leader, ...team.members].map(m => users.find(u => u.uid === m.uid)).filter(Boolean) as UserProfile[];
      return members.length === 6 && members.some(m => m.gender === 'F');
    });

    const registeredParticipantUids = new Set(registeredTeams.flatMap(t => [t.leader.uid, ...t.members.map(m => m.uid)]));
    const participants = users.filter(u => registeredParticipantUids.has(u.uid));

    const genderCounts = participants.reduce((acc, user) => {
      if (user.gender === 'M') acc.male++;
      if (user.gender === 'F') acc.female++;
      return acc;
    }, { male: 0, female: 0 });

    return [
      { gender: 'Male', value: genderCounts.male, fill: 'hsl(var(--chart-2))' },
      { gender: 'Female', value: genderCounts.female, fill: 'hsl(var(--chart-5))' },
    ];
  };

  const getTeamStatusData = (): TeamStatusChartData[] => {
    let registeredCount = 0;
    let pendingCount = 0;
    teams.forEach(team => {
       const allMemberUIDs = [team.leader.uid, ...team.members.map(m => m.uid)];
       const members = users.filter(u => allMemberUIDs.includes(u.uid));
       const hasFemale = members.some(m => m.gender === 'F');
       
       if (members.length === 6 && hasFemale) {
         registeredCount++;
       } else {
         pendingCount++;
       }
    });
    return [
      { status: 'Registered', count: registeredCount, fill: 'hsl(var(--chart-1))' },
      { status: 'Pending', count: pendingCount, fill: 'hsl(var(--chart-4))' },
    ];
  };

  const getProblemStatementData = (): ProblemStatementChartData[] => {
    const psCounts: { [key: string]: number } = {};
    teams.forEach(team => {
        if (team.problemStatementId) {
            const ps = problemStatements.find(p => p.id === team.problemStatementId);
            if (ps && ps.problemStatementId) {
                psCounts[ps.problemStatementId] = (psCounts[ps.problemStatementId] || 0) + 1;
            }
        }
    });

    return Object.entries(psCounts)
        .map(([psId, count]) => ({ psId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Get top 10
  };

  const instituteChartData = getInstituteData();
  const categoryChartData = getCategoryData();
  const genderChartData = getGenderData();
  const teamStatusChartData = getTeamStatusData();
  const problemStatementChartData = getProblemStatementData();
  const totalParticipants = genderChartData.reduce((acc, curr) => acc + curr.value, 0);

  const chartConfig = {
    teams: { label: "Teams", color: "hsl(var(--chart-1))" },
    count: { label: "Count", color: "hsl(var(--chart-1))" },
    male: { label: "Male", color: "hsl(var(--chart-2))" },
    female: { label: "Female", color: "hsl(var(--chart-5))" }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Analytics</h1>
        <p className="text-muted-foreground">A visual overview of hackathon registration data.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Teams per Institute</CardTitle>
            <CardDescription>Distribution of teams across different institutes.</CardDescription>
          </CardHeader>
          <CardContent>
            {instituteChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={instituteChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="institute" type="category" width={150} interval={0} tick={{ fontSize: 12 }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="teams" fill="var(--color-teams)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <p className="text-center text-muted-foreground py-10">No team data available to display.</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Teams per Category</CardTitle>
            <CardDescription>Distribution of teams between Hardware and Software categories.</CardDescription>
          </CardHeader>
          <CardContent>
             {categoryChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                   <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="teams" fill="var(--color-teams)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
             ) : (
                <p className="text-center text-muted-foreground py-10">No teams have selected a category yet.</p>
             )}
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
            <CardTitle>Gender Distribution (Registered Teams)</CardTitle>
            <CardDescription>Total Participants in Registered Teams: {totalParticipants}</CardDescription>
          </CardHeader>
          <CardContent>
             {totalParticipants > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent />} />
                            <Pie
                                data={genderChartData}
                                dataKey="value"
                                nameKey="gender"
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                    return (
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                            >
                                {genderChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
             ) : (
                <p className="text-center text-muted-foreground py-10">No fully registered teams available to display stats for.</p>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Registration Status</CardTitle>
            <CardDescription>Number of fully registered vs. pending teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={400}>
                <BarChart data={teamStatusChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                       {teamStatusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Top 10 Problem Statements</CardTitle>
                <CardDescription>Most frequently selected problem statements by teams.</CardDescription>
            </CardHeader>
            <CardContent>
                {problemStatementChartData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={problemStatementChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="psId" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
                                <YAxis allowDecimals={false}/>
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-teams)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <p className="text-center text-muted-foreground py-10">No teams have selected a problem statement yet.</p>
                )}
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
