
"use client";

import { useEffect, useState, useRef } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Pie, PieChart, Cell, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Team, UserProfile } from "@/lib/types";
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

export default function AnalyticsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
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
    
    // Use a promise to wait for the initial fetch of both collections
    Promise.all([
        new Promise(resolve => onSnapshot(teamsCollection, () => resolve(true), () => resolve(false))),
        new Promise(resolve => onSnapshot(usersCollection, () => resolve(true), () => resolve(false))),
    ]).finally(() => setLoading(false));

    return () => {
      unsubscribeTeams();
      unsubscribeUsers();
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
    const participants = users.filter(u => u.teamId); // Only count users who are in a team
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

  const instituteChartData = getInstituteData();
  const categoryChartData = getCategoryData();
  const genderChartData = getGenderData();
  const totalParticipants = genderChartData.reduce((acc, curr) => acc + curr.value, 0);

  const chartConfig = {
    teams: {
      label: "Teams",
      color: "hsl(var(--chart-1))",
    },
    male: {
      label: "Male",
      color: "hsl(var(--chart-2))",
    },
    female: {
      label: "Female",
      color: "hsl(var(--chart-5))",
    }
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
            <CardTitle>Participant Gender Distribution</CardTitle>
            <CardDescription>Total Participants: {totalParticipants}</CardDescription>
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
                <p className="text-center text-muted-foreground py-10">No participant data available to display.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
