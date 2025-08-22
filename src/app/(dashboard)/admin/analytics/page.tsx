
"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Team } from "@/lib/types";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface InstituteChartData {
  institute: string;
  teams: number;
}

interface CategoryChartData {
  category: string;
  teams: number;
}

export default function AnalyticsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const teamsCollection = collection(db, 'teams');
    const unsubscribe = onSnapshot(teamsCollection, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching teams:", error);
      toast({ title: "Error", description: "Failed to fetch team data for analytics.", variant: "destructive" });
      setLoading(false);
    });
    return () => unsubscribe();
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

  const instituteChartData = getInstituteData();
  const categoryChartData = getCategoryData();

  const chartConfig = {
    teams: {
      label: "Teams",
      color: "hsl(var(--chart-1))",
    },
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

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
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
      </div>
    </div>
  );
}
