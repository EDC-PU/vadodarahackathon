
"use client";

import { useEffect, useState, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Pie, PieChart, Cell, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Team, UserProfile, ProblemStatement, Institute } from "@/lib/types";
import { collection, onSnapshot, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { exportInstituteAnalytics } from "@/ai/flows/export-institute-analytics-flow";

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

interface InstituteAnalyticsData {
    institute: string;
    totalRegistered: number;
    shortlistedSoftware: number;
    registeredSoftware: number;
    shortlistedHardware: number;
    registeredHardware: number;
    totalShortlisted: number;
}

export default function AnalyticsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDeadline = async () => {
        try {
            const configDocRef = doc(db, "config", "event");
            const configDoc = await getDoc(configDocRef);
            if (configDoc.exists() && configDoc.data()?.registrationDeadline) {
                setDeadline(configDoc.data().registrationDeadline.toDate());
            }
        } catch (error) {
            console.error("Could not fetch registration deadline:", error);
        }
    };
    fetchDeadline();
  }, []);

  useEffect(() => {
    setLoading(true);

    const teamsUnsub = onSnapshot(collection(db, 'teams'), (snap) => setTeams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team))));
    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))));
    const psUnsub = onSnapshot(collection(db, 'problemStatements'), (snap) => setProblemStatements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement))));
    const institutesUnsub = onSnapshot(collection(db, 'institutes'), (snap) => setInstitutes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institute))));

    Promise.all([
      new Promise(res => onSnapshot(collection(db, 'teams'), () => res(true), () => res(false))),
      new Promise(res => onSnapshot(collection(db, 'users'), () => res(true), () => res(false))),
      new Promise(res => onSnapshot(collection(db, 'problemStatements'), () => res(true), () => res(false))),
      new Promise(res => onSnapshot(collection(db, 'institutes'), () => res(true), () => res(false))),
    ]).then(() => setLoading(false)).catch(err => {
      console.error("Error on initial data load:", err);
      toast({ title: "Error", description: "Could not load all data for analytics.", variant: "destructive" });
      setLoading(false);
    });

    return () => {
      teamsUnsub();
      usersUnsub();
      psUnsub();
      institutesUnsub();
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
      return members.length === 6 && members.some(m => m.gender === 'F') && !!team.problemStatementId;
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
       
       if (members.length === 6 && hasFemale && !!team.problemStatementId) {
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
  
  const instituteAnalyticsData: InstituteAnalyticsData[] = useMemo(() => {
    const instituteMap = new Map<string, InstituteAnalyticsData>();

    institutes.forEach(inst => {
      instituteMap.set(inst.name, {
        institute: inst.name,
        totalRegistered: 0,
        shortlistedSoftware: 0,
        registeredSoftware: 0,
        shortlistedHardware: 0,
        registeredHardware: 0,
        totalShortlisted: 0,
      });
    });
    
    const userMap = new Map(users.map(u => [u.uid, u]));

    teams.forEach(team => {
      const instData = instituteMap.get(team.institute);
      if (!instData) return;

      const memberUIDs = [team.leader.uid, ...team.members.map(m => m.uid)];
      const teamMemberProfiles = memberUIDs.map(uid => userMap.get(uid)).filter(Boolean) as UserProfile[];
      
      const hasFemale = teamMemberProfiles.some(m => m.gender === 'F');
      const instituteCount = teamMemberProfiles.filter(m => m.institute === team.institute).length;

      const isRegistered = teamMemberProfiles.length === 6 && hasFemale && instituteCount >= 3 && !!team.problemStatementId;
      
      if(isRegistered) {
          instData.totalRegistered += 1;
      }
      
      const isNominated = team.isNominated === true;
      
      if (isNominated) {
          instData.totalShortlisted += 1;
      }
      
      if (team.category === 'Software') {
        if(isRegistered) instData.registeredSoftware += 1;
        if (isNominated) {
          instData.shortlistedSoftware += 1;
        }
      } else if (team.category === 'Hardware') {
        if(isRegistered) instData.registeredHardware += 1;
        if (isNominated) {
          instData.shortlistedHardware += 1;
        }
      }
    });

    return Array.from(instituteMap.values()).sort((a, b) => b.totalRegistered - a.totalRegistered);
  }, [teams, institutes, users]);

  const handleExport = async () => {
    if (instituteAnalyticsData.length === 0) {
      toast({ title: "No Data", description: "There is no analytics data to export.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const result = await exportInstituteAnalytics({ analyticsData: instituteAnalyticsData });
      if (result.success && result.fileContent) {
        const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName || 'institute-analytics.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast({ title: "Success", description: "Analytics data exported." });
      } else {
        throw new Error(result.message || "Failed to export analytics.");
      }
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="col-span-1 md:col-span-2 xl:col-span-3">
           <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Institute-wise Team Statistics</CardTitle>
                <CardDescription>A detailed breakdown of team registrations and shortlisting by institute.</CardDescription>
            </div>
            <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Institute</TableHead>
                  <TableHead className="text-center">Total Registered</TableHead>
                  <TableHead className="text-center">Shortlisted Software</TableHead>
                  <TableHead className="text-center">Registered Software</TableHead>
                  <TableHead className="text-center">Shortlisted Hardware</TableHead>
                  <TableHead className="text-center">Registered Hardware</TableHead>
                  <TableHead className="text-center font-bold">Total Shortlisted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instituteAnalyticsData.map(data => (
                  <TableRow key={data.institute}>
                    <TableCell className="font-medium">{data.institute}</TableCell>
                    <TableCell className="text-center">{data.totalRegistered}</TableCell>
                    <TableCell className="text-center">{data.shortlistedSoftware}</TableCell>
                    <TableCell className="text-center">{data.registeredSoftware}</TableCell>
                    <TableCell className="text-center">{data.shortlistedHardware}</TableCell>
                    <TableCell className="text-center">{data.registeredHardware}</TableCell>
                    <TableCell className="text-center font-bold">{data.totalShortlisted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Teams per Institute</CardTitle>
            <CardDescription>Distribution of teams across different institutes.</CardDescription>
          </CardHeader>
          <CardContent>
            {instituteChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                  <ResponsiveContainer width="100%" height={Math.max(300, instituteChartData.length * 40)}>
                    <BarChart data={instituteChartData} layout="vertical" margin={{ left: 100, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="institute" type="category" width={100} interval={0} tick={{ fontSize: 12 }} />
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
                   <ResponsiveContainer width="100%" height={300}>
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
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={14}>
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

        <Card className="md:col-span-2 xl:col-span-3">
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
