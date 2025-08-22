"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, User, Users, Shield, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [spocs, setSpocs] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState({ teams: 0, participants: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Teams
      const teamsCollection = collection(db, 'teams');
      const teamSnapshot = await getDocs(teamsCollection);
      const teamsData = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);

      // Fetch Users (SPOCs and Admins)
      const usersCollection = collection(db, 'users');
      const spocsQuery = query(usersCollection, where("role", "==", "spoc"));
      const adminsQuery = query(usersCollection, where("role", "==", "admin"));
      
      const spocSnapshot = await getDocs(spocsQuery);
      const spocsData = spocSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setSpocs(spocsData);

      const adminSnapshot = await getDocs(adminsQuery);
      const adminsData = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setAdmins(adminsData);
      
      // Calculate stats
      const totalParticipants = teamsData.reduce((acc, team) => acc + 1 + team.members.length, 0);
      setStats({ teams: teamsData.length, participants: totalParticipants });

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('admin-email') as string;

    // This is a simplified version. In a real app, you'd use a Cloud Function
    // to look up the user by email, get their UID, and set a custom claim or Firestore doc.
    toast({ title: "Info", description: "In a real app, a Cloud Function would handle admin creation securely." });
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
        <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage the hackathon, participants, and SPOCs.</p>
      </header>
      
      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="spocs">Manage SPOCs</TabsTrigger>
              <TabsTrigger value="admins">Manage Admins</TabsTrigger>
              <TabsTrigger value="teams">All Teams</TabsTrigger>
              <TabsTrigger value="settings">Event Settings</TabsTrigger>
            </TabsList>
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export All Data
            </Button>
        </div>

        <TabsContent value="overview">
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
            </div>
        </TabsContent>

        <TabsContent value="spocs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SPOC Management</CardTitle>
                <CardDescription>Create and manage institute SPOCs. ({spocs.length} SPOCs)</CardDescription>
              </div>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add SPOC
              </Button>
            </CardHeader>
            <CardContent>
                {spocs.length > 0 ? (
                  <ul className="space-y-2">
                    {spocs.map(spoc => <li key={spoc.uid}>{spoc.name} - {spoc.email} ({spoc.institute})</li>)}
                  </ul>
                ) : <p>No SPOCs found.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Create Admin</CardTitle>
                        <CardDescription>Add a new administrator by email.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div>
                                <Label htmlFor="admin-email">Admin Email</Label>
                                <Input id="admin-email" name="admin-email" type="email" placeholder="admin@example.com" />
                            </div>
                            <Button type="submit"><PlusCircle className="mr-2 h-4 w-4" /> Create Admin</Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Current Admins</CardTitle>
                        <CardDescription>The following users have admin privileges.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {admins.length > 0 ? admins.map(admin => (
                            <div key={admin.uid} className="flex items-center gap-3 p-3 bg-secondary rounded-md">
                                <Shield className="h-5 w-5 text-primary"/>
                                <span className="font-medium">{admin.email}</span>
                            </div>
                        )) : <p>No other admins found.</p>}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="teams">
           <Card>
            <CardHeader>
              <CardTitle>All Registered Teams</CardTitle>
              <CardDescription>View and manage all teams across all institutes. ({teams.length} teams)</CardDescription>
            </CardHeader>
            <CardContent>
                {teams.length > 0 ? (
                  <ul className="space-y-2">
                      {teams.map(team => (
                          <li key={team.id}>
                              <strong>{team.name}</strong> ({team.institute}) - {team.members.length + 1} members
                          </li>
                      ))}
                  </ul>
                ): <p>No teams have registered yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
             <CardHeader>
              <CardTitle>Event Information</CardTitle>
              <CardDescription>Update hackathon details like dates, rewards, and documents.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Event settings form would go here */}
              <p>Form to edit event settings will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
