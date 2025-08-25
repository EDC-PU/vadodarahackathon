
"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Team, UserProfile } from "@/lib/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DepartmentChartData {
  department: string;
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


export default function SpocAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.institute) {
        setLoading(false);
        return;
    }
    setLoading(true);

    const teamsQuery = query(collection(db, 'teams'), where('institute', '==', user.institute));
    const unsubscribeTeams = onSnapshot(teamsQuery, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);

      if (teamsData.length > 0) {
        const allUserIds = new Set<string>();
        teamsData.forEach(team => {
            allUserIds.add(team.leader.uid);
            team.members.forEach(member => {
                if (member.uid) allUserIds.add(member.uid);
            });
        });
        
        const usersQuery = query(collection(db, 'users'), where('uid', 'in', Array.from(allUserIds)));
        const unsubscribeUsers = onSnapshot(usersQuery, (userSnapshot) => {
            const usersData = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
            setUsers(usersData);
            setLoading(false);
        }, (error) => {
             console.error("Error fetching users for analytics:", error);
             toast({ title: "Error", description: "Failed to fetch user data.", variant: "destructive" });
             setLoading(false);
        });
        
        return () => unsubscribeUsers();

      } else {
         setLoading(false);
      }

    }, (error) => {
      console.error("Error fetching teams for analytics:", error);
      toast({ title: "Error", description: "Failed to fetch team data.", variant: "destructive" });
      setLoading(false);
    });
    
    return () => unsubscribeTeams();
  }, [user?.institute, toast]);
  

  const getDepartmentData = (): DepartmentChartData[] => {
    const departmentCounts: { [key: string]: number } = {};
    teams.forEach(team => {
      const dept = team.department || 'Unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    return Object.entries(departmentCounts).map(([department, count]) => ({
      department,
      teams: count,
    })).sort((a, b) => b.teams - a.teams);
  };
  
  const getTeamStatusData = (): TeamStatusChartData[] => {
    let registeredCount = 0;
    let pendingCount = 0;
    teams.forEach(team => {
       const allMemberUIDs = [team.leader.uid, ...team.members.map(m => m.uid)];
       const hasFemale = users.some(u => allMemberUIDs.includes(u.uid) && u.gender === 'F');

       if (team.members.length + 1 === 6 && hasFemale) {
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

  const getGenderData = (): GenderChartData[] => {
    const genderCounts = users.reduce((acc, user) => {
        if (user.gender === 'M') acc.male++;
        if (user.gender === 'F') acc.female++;
        return acc;
    }, { male: 0, female: 0 });

    return [
        { gender: 'Male', value: genderCounts.male, fill: 'hsl(var(--chart-2))' },
        { gender: 'Female', value: genderCounts.female, fill: 'hsl(var(--chart-5))' },
    ];
  };

  const departmentChartData = getDepartmentData();
  const teamStatusChartData = getTeamStatusData();
  const genderChartData = getGenderData();
  const totalParticipants = users.length;
  
  const chartConfig = {
    teams: { label: "Teams", color: "hsl(var(--chart-1))" },
    count: { label: "Count", color: "hsl(var(--chart-1))" },
    male: { label: "Male", color: "hsl(var(--chart-2))" },
    female: { label: "Female", color: "hsl(var(--chart-5))" },
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return (
         <div className="p-4 sm:p-6 lg:p-8">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>You are not authorized to view this page.</AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Institute Analytics</h1>
        <p className="text-muted-foreground">A visual overview of registration data for <strong>{user.institute}</strong>.</p>
      </header>

      {teams.length === 0 ? (
           <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Data Available</AlertTitle>
              <AlertDescription>
                There are no teams registered from your institute yet. Analytics will appear here once teams start registering.
              </AlertDescription>
            </Alert>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Teams per Department</CardTitle>
              <CardDescription>Distribution of teams across different departments.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="department" type="category" width={150} interval={0} tick={{ fontSize: 12 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="teams" fill="var(--color-teams)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Team Registration Status</CardTitle>
              <CardDescription>Number of fully registered vs. pending teams.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
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

          <Card>
            <CardHeader>
              <CardTitle>Participant Gender Distribution</CardTitle>
              <CardDescription>Total Participants: {totalParticipants}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                  <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                          <Tooltip content={<ChartTooltipContent />} />
                          <Pie
                              data={genderChartData}
                              dataKey="value"
                              nameKey="gender"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
