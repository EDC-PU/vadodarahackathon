
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Team, UserProfile, TeamMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function AllTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const teamsCollection = collection(db, 'teams');
    const usersCollection = collection(db, 'users');

    const unsubscribeTeams = onSnapshot(teamsCollection, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
    }, (error) => {
      console.error("Error fetching teams:", error);
      toast({ title: "Error", description: "Failed to fetch teams.", variant: "destructive" });
    });

    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to fetch user data.", variant: "destructive" });
    });

    // Wait for both snapshots to load initially
    Promise.all([
        new Promise(res => { const unsub = onSnapshot(teamsCollection, () => { res(true); unsub(); }); }),
        new Promise(res => { const unsub = onSnapshot(usersCollection, () => { res(true); unsub(); }); })
    ]).then(() => setLoading(false));

    return () => {
      unsubscribeTeams();
      unsubscribeUsers();
    };
  }, [toast]);

  const getTeamWithFullDetails = () => {
    return teams.map(team => {
        const leaderProfile = users.find(u => u.uid === team.leader.uid);
        const membersWithDetails = team.members.map(member => {
            const memberProfile = users.find(u => u.email === member.email);
            return {
                ...member,
                enrollmentNumber: memberProfile?.enrollmentNumber || member.enrollmentNumber || 'N/A',
                contactNumber: memberProfile?.contactNumber || member.contactNumber || 'N/A',
            };
        });
        const allMembers = [
            {
                name: leaderProfile?.name || team.leader.name,
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
  
  const teamsWithDetails = getTeamWithFullDetails();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">All Teams</h1>
        <p className="text-muted-foreground">View and manage all registered teams.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Registered Teams List</CardTitle>
          <CardDescription>
            {teams.length} team(s) registered across all institutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : teams.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Team No.</TableHead>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Member Name</TableHead>
                        <TableHead>Enrollment No.</TableHead>
                        <TableHead>Contact No.</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {teamsWithDetails.map((team, index) => (
                       team.allMembers.map((member, memberIndex) => (
                         <TableRow key={`${team.id}-${memberIndex}`}>
                            {memberIndex === 0 && (
                                <>
                                    <TableCell rowSpan={team.allMembers.length} className="font-medium align-top">{index + 1}</TableCell>
                                    <TableCell rowSpan={team.allMembers.length} className="font-medium align-top">{team.name}</TableCell>
                                </>
                            )}
                            <TableCell>{member.name} {member.isLeader && '(Leader)'}</TableCell>
                            <TableCell>{member.enrollmentNumber}</TableCell>
                            <TableCell>{member.contactNumber}</TableCell>
                         </TableRow>
                       ))
                    ))}
                </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">No teams have registered yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
