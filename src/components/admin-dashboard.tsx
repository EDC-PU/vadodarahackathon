
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Shield, UserPlus, FileText, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { exportTeams } from "@/ai/flows/export-teams-flow";


export default function AdminDashboard() {
  const [stats, setStats] = useState({ teams: 0, participants: 0, spocs: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
    <div className="p-4 sm:p-6 lg:p-8">
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

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Recent activity feed will be shown here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
