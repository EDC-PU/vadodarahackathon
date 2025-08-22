
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Save, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { AnnouncementsSection } from "./announcements-section";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";

export default function SpocDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<{ id: string, name: string } | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);

          if (userData.role === 'spoc' && userData.institute) {
            // Fetch teams for the SPOC's institute
            const teamsQuery = query(collection(db, "teams"), where("institute", "==", userData.institute));
            const unsubscribeTeams = onSnapshot(teamsQuery, (querySnapshot) => {
              const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
              setTeams(teamsData);
              if (loading) setLoading(false);
            }, (error) => {
              console.error("Error fetching teams:", error);
              setLoading(false);
            });

            // Fetch all users to populate member details
            const usersQuery = query(collection(db, "users"));
            const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
                const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
                setUsers(usersData);
            });

            return () => {
              unsubscribeTeams();
              unsubscribeUsers();
            };
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTeamWithFullDetails = () => {
    return teams.map(team => {
        const leaderProfile = users.find(u => u.uid === team.leader.uid);
        const membersWithDetails = team.members.map(member => {
            const memberProfile = users.find(u => u.email === member.email);
            return {
                ...member,
                enrollmentNumber: memberProfile?.enrollmentNumber || 'N/A',
                contactNumber: memberProfile?.contactNumber || 'N/A',
            };
        });
        const allMembers = [
            {
                name: leaderProfile?.name || team.leader.name,
                email: leaderProfile?.email || team.leader.email,
                enrollmentNumber: leaderProfile?.enrollmentNumber || 'N/A',
                contactNumber: leaderProfile?.contactNumber || 'N/A',
                isLeader: true,
            },
            ...membersWithDetails.map(m => ({...m, isLeader: false})),
        ];
        return {
            ...team,
            allMembers,
        };
    });
  };

  const handleEditTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
        setEditingTeam({ id: teamId, name: team.name });
    }
  };

  const handleSaveTeamName = async (teamId: string) => {
      if (!editingTeam || editingTeam.id !== teamId) return;

      setIsSaving(teamId);
      try {
          const teamDocRef = doc(db, "teams", teamId);
          await updateDoc(teamDocRef, { name: editingTeam.name });
          toast({ title: "Success", description: "Team name updated." });
          setEditingTeam(null);
      } catch (error) {
          console.error("Error updating team name:", error);
          toast({ title: "Error", description: "Could not update team name.", variant: "destructive" });
      } finally {
          setIsSaving(null);
      }
  };


  if (loading) {
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

  const teamsWithDetails = getTeamWithFullDetails();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">SPOC Dashboard</h1>
        <p className="text-muted-foreground">Manage teams from your institute: <strong>{user?.institute}</strong></p>
      </header>

      <div className="mb-8">
        <AnnouncementsSection audience="spocs_and_all" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institute Teams</CardTitle>
          <CardDescription>{teams.length} team(s) registered from your institute.</CardDescription>
        </CardHeader>
        <CardContent>
            {teams.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No teams have registered from your institute yet.</p>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Member Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Enrollment No.</TableHead>
                        <TableHead>Contact No.</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {teamsWithDetails.map((team) => (
                       team.allMembers.map((member, memberIndex) => (
                         <TableRow key={`${team.id}-${memberIndex}`}>
                            {memberIndex === 0 && (
                                <TableCell rowSpan={team.allMembers.length} className="font-medium align-top">
                                    {editingTeam?.id === team.id ? (
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                value={editingTeam.name}
                                                onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                                className="w-40"
                                                disabled={isSaving === team.id}
                                            />
                                            <Button size="icon" className="h-8 w-8" onClick={() => handleSaveTeamName(team.id)} disabled={isSaving === team.id}>
                                                {isSaving === team.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                                            </Button>
                                             <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTeam(null)} disabled={isSaving === team.id}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>{team.name}</span>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditTeamName(team.id)}>
                                                <Pencil className="h-4 w-4 text-muted-foreground"/>
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            )}
                            <TableCell>{member.name} {member.isLeader && '(Leader)'}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>{member.enrollmentNumber}</TableCell>
                            <TableCell>{member.contactNumber}</TableCell>
                         </TableRow>
                       ))
                    ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
