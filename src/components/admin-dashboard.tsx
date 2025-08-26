
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Shield, UserPlus, FileText, Download, Loader2, List, CaseSensitive } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { Team, UserProfile, Notification } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { exportTeams } from "@/ai/flows/export-teams-flow";
import { Buffer } from 'buffer';
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";


export default function AdminDashboard() {
  const [stats, setStats] = useState({ teams: 0, participants: 0, spocs: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [recentActivity, setRecentActivity] = useState<Notification[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const { toast } = useToast();

  const mainRef = useRef<HTMLDivElement>(null);
  const isInView = useScrollAnimation(mainRef);

  useEffect(() => {
    const activityQuery = query(collection(db, "logs"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
        const activities = snapshot.docs.map(doc => doc.data() as Notification);
        setRecentActivity(activities);
        setLoadingActivity(false);
    });

    return () => unsubscribeActivity();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
        const result = await exportTeams({ institute: "All Institutes", category: "All Categories" });
        if (result.success && result.fileContent) {
            const blob = new Blob([Buffer.from(result.fileContent, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName || 'teams-export.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Success", description: "Team data has been exported." });
        } else {
            toast({ title: "Export Failed", description: result.message || "Could not generate the export file.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error exporting data:", error);
        toast({ title: "Error", description: "An unexpected error occurred during export.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
        console.log("AdminDashboard: Starting to fetch data...");
        setLoading(true);
        try {
          console.log("AdminDashboard: Fetching teams collection...");
          const teamsCollection = collection(db, 'teams');
          const teamSnapshot = await getDocs(teamsCollection);
          const teamsData = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          console.log(`AdminDashboard: Fetched ${teamsData.length} teams.`);
    
          console.log("AdminDashboard: Fetching users collection for SPOCs and Admins...");
          const usersCollection = collection(db, 'users');
          const spocsQuery = query(usersCollection, where("role", "==", "spoc"));
          const adminsQuery = query(usersCollection, where("role", "==", "admin"));
          
          const spocSnapshot = await getDocs(spocsQuery);
          const adminSnapshot = await getDocs(adminsQuery);
          console.log(`AdminDashboard: Fetched ${spocSnapshot.size} SPOCs and ${adminSnapshot.size} Admins.`);
          
          // Calculate stats
          const totalParticipants = teamsData.reduce((acc, team) => acc + 1 + team.members.length, 0);
          const newStats = {
              teams: teamsData.length,
              participants: totalParticipants,
              spocs: spocSnapshot.size,
              admins: adminSnapshot.size,
          };
          setStats(newStats);
          console.log("AdminDashboard: Stats calculated and set:", newStats);
    
        } catch (error) {
          console.error("Error fetching admin dashboard data:", error);
          toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
        } finally {
          console.log("AdminDashboard: Data fetching finished.");
          setLoading(false);
        }
      };

    fetchData();
  }, [toast]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div ref={mainRef} className={cn("p-4 sm:p-6 lg:p-8")}>
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
            <p className="text-muted-foreground">An overview of the hackathon portal.</p>
        </div>
      </header>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{stats.teams}</div>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{stats.participants}</div>
                   <p className="text-xs text-muted-foreground">Across all teams</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SPOCs</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{stats.spocs}</div>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Admins</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{stats.admins}</div>
              </CardContent>
          </Card>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data Export</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Export all team data to Excel format.</p>
            <Button onClick={handleExport} className="w-full" disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExporting ? "Exporting..." : "Export Teams to Excel"}
            </Button>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><List /> Recent Activity</CardTitle>
                 <CardDescription>A feed of the latest events happening on the portal.</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingActivity ? (
                     <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : recentActivity.length > 0 ? (
                    <div className="space-y-4">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  {activity.title.includes("Team") ? <Users className="h-5 w-5 text-primary" /> 
                                    : activity.title.includes("SPOC") ? <UserPlus className="h-5 w-5 text-accent" />
                                    : <User className="h-5 w-5 text-muted-foreground" />}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-medium leading-tight">{activity.title}</p>
                                    <p className="text-xs text-muted-foreground">{activity.message}</p>
                                </div>
                                 <div className="text-xs text-muted-foreground flex-shrink-0">
                                    {formatDistanceToNow(activity.createdAt.seconds * 1000, { addSuffix: true })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-10">No recent activity to display.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
