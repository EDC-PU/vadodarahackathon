"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { MoreHorizontal, Loader2, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { Team, UserProfile } from "@/lib/types";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";

export default function SpocDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);

          if (userData.role === 'spoc' && userData.institute) {
            const teamsQuery = query(collection(db, "teams"), where("institute", "==", userData.institute));
            const unsubscribeSnapshot = onSnapshot(teamsQuery, (querySnapshot) => {
              const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
              setTeams(teamsData);
              setLoading(false);
            }, (error) => {
              console.error("Error fetching teams:", error);
              setLoading(false);
            });
            return () => unsubscribeSnapshot();
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">SPOC Dashboard</h1>
        <p className="text-muted-foreground">Manage teams from your institute: <strong>{user?.institute}</strong></p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Institute Teams</CardTitle>
          <CardDescription>A list of all teams registered from your institute.</CardDescription>
        </CardHeader>
        <CardContent>
            {teams.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No teams have registered from your institute yet.</p>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Team Leader</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                        <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {teams.map((team) => {
                        const memberCount = team.members.length + 1;
                        const isComplete = memberCount === 6;
                        return (
                            <TableRow key={team.id}>
                                <TableCell className="font-medium">{team.name}</TableCell>
                                <TableCell>{team.leader.name}</TableCell>
                                <TableCell>{memberCount}/6</TableCell>
                                <TableCell>
                                    <Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>{team.category}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={isComplete ? 'outline' : 'destructive'}>{isComplete ? 'Complete' : 'Incomplete'}</Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem>View Details</DropdownMenuItem>
                                        <DropdownMenuItem>Edit Team</DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
