
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Calendar, Users, CheckCircle } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { UserProfile, Institute, Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AddSpocDialog } from "@/components/add-spoc-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface InstituteStats {
    totalTeams: number;
    registeredTeams: number;
}

export default function ManageSpocsPage() {
  const [spocs, setSpocs] = useState<UserProfile[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSpocOpen, setIsAddSpocOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const spocsQuery = query(collection(db, 'users'), where("role", "==", "spoc"));
    const institutesQuery = query(collection(db, 'institutes'));
    const teamsQuery = query(collection(db, 'teams'));
    const usersQuery = query(collection(db, 'users'));

    const unsubSpocs = onSnapshot(spocsQuery, snap => setSpocs(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))));
    const unsubInst = onSnapshot(institutesQuery, snap => setInstitutes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Institute))));
    const unsubTeams = onSnapshot(teamsQuery, snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team))));
    const unsubUsers = onSnapshot(usersQuery, snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))));

    // Set loading to false once all initial data is likely fetched
    Promise.all([
        getDocs(spocsQuery),
        getDocs(institutesQuery),
        getDocs(teamsQuery),
        getDocs(usersQuery)
    ]).then(() => setLoading(false)).catch(err => {
        console.error("Error during initial data fetch:", err);
        toast({ title: "Error", description: "Failed to fetch initial data.", variant: "destructive" });
        setLoading(false);
    });

    return () => {
      unsubSpocs();
      unsubInst();
      unsubTeams();
      unsubUsers();
    };
  }, [toast]);

   const instituteStats = useMemo(() => {
    const stats = new Map<string, InstituteStats>();
    const userMap = new Map(users.map(u => [u.uid, u]));

    teams.forEach(team => {
        if (!team.institute) return;

        const currentStats = stats.get(team.institute) || { totalTeams: 0, registeredTeams: 0 };
        currentStats.totalTeams += 1;
        
        const memberUIDs = [team.leader.uid, ...team.members.map(m => m.uid)];
        const teamMemberProfiles = memberUIDs.map(uid => userMap.get(uid)).filter(Boolean) as UserProfile[];
        
        const hasFemale = teamMemberProfiles.some(m => m.gender === 'F');
        const instituteCount = teamMemberProfiles.filter(m => m.institute === team.institute).length;

        if (teamMemberProfiles.length === 6 && hasFemale && instituteCount >= 3 && !!team.problemStatementId) {
            currentStats.registeredTeams += 1;
        }

        stats.set(team.institute, currentStats);
    });
    return stats;
  }, [teams, users]);
  
  const instituteMap = useMemo(() => {
    return institutes.reduce((map, inst) => {
      map[inst.name] = inst;
      return map;
    }, {} as Record<string, Institute>);
  }, [institutes]);

  const getStatusVariant = (status?: 'pending' | 'approved' | 'rejected'): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'approved':
            return 'default';
        case 'pending':
            return 'secondary';
        case 'rejected':
            return 'destructive';
        default:
            return 'secondary';
    }
  }

  return (
    <>
      <AddSpocDialog
        isOpen={isAddSpocOpen}
        onOpenChange={setIsAddSpocOpen}
        onSpocAdded={() => { /* onSnapshot handles updates */ }}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold font-headline">Manage SPOCs</h1>
                <p className="text-muted-foreground">Create and manage institute Single Points of Contact.</p>
            </div>
            <Button onClick={() => setIsAddSpocOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add SPOC
            </Button>
        </header>

        <Card>
            <CardHeader>
              <CardTitle>SPOC List</CardTitle>
              <CardDescription>
                {spocs.length} SPOC(s) found. Login credentials are automatically emailed upon creation.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : spocs.length > 0 ? (
                  <ul className="space-y-4">
                    {spocs.map(spoc => {
                       const instituteDetails = spoc.institute ? instituteMap[spoc.institute] : null;
                       const evaluationDates = instituteDetails?.evaluationDates;
                       const stats = spoc.institute ? instituteStats.get(spoc.institute) : null;
                       return (
                        <li key={spoc.uid} className="p-4 border rounded-md flex justify-between items-start">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 flex-1">
                                <div className="space-y-1">
                                    <p className="font-semibold text-lg">{spoc.name}</p>
                                    <p className="text-sm text-muted-foreground">{spoc.email}</p>
                                    <p className="text-sm text-muted-foreground">{spoc.contactNumber || 'N/A'}</p>
                                    <p className="text-sm text-muted-foreground font-medium">{spoc.institute}</p>
                                </div>
                                 <div className="space-y-1 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 pt-1">
                                        <Users className="h-4 w-4" />
                                        <strong>Registered Teams:</strong>
                                        <span className="font-medium text-foreground">{stats?.registeredTeams ?? 0} / {stats?.totalTeams ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                        <Calendar className="h-4 w-4" />
                                        <strong>Hackathon Dates:</strong>
                                        {evaluationDates && evaluationDates.length > 0 ? (
                                            <span className="font-medium text-foreground">{evaluationDates.map(d => format((d as any).toDate(), 'MMM d, yyyy')).join(' & ')}</span>
                                        ) : (
                                            <span className="text-destructive">Not Set</span>
                                        )}
                                    </div>
                                    <p><strong>AICTE No:</strong> {spoc.aicteApplicationNumber || 'N/A'}</p>
                                    <p><strong>Principal:</strong> {spoc.principalInitial || ''} {spoc.principalName || 'N/A'}</p>
                                    <p><strong>Principal Email:</strong> {spoc.principalEmail || 'N/A'}</p>
                                </div>
                            </div>
                            <Badge variant={getStatusVariant(spoc.spocStatus)} className={spoc.spocStatus === 'approved' ? 'bg-green-600' : ''}>
                              {spoc.spocStatus ? spoc.spocStatus.charAt(0).toUpperCase() + spoc.spocStatus.slice(1) : 'N/A'}
                            </Badge>
                        </li>
                       )
                    })}
                  </ul>
                ) : <p className="text-center text-muted-foreground py-4">No SPOCs have been created yet.</p>}
            </CardContent>
          </Card>
      </div>
    </>
  );
}
