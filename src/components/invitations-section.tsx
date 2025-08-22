
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MailCheck, Check, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, writeBatch, doc, getDoc } from "firebase/firestore";
import { Invitation, Team, UserProfile } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export function InvitationsSection() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const invitationsCollection = collection(db, 'invitations');
    const q = query(
      invitationsCollection,
      where("email", "==", user.email),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation));
      setInvitations(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching invitations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleInvitation = async (invitationId: string, teamId: string, accepted: boolean) => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    if (!user.enrollmentNumber) {
        toast({ title: "Profile Incomplete", description: "Please complete your profile before accepting an invitation.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(invitationId);
    
    const batch = writeBatch(db);
    const invitationRef = doc(db, 'invitations', invitationId);

    if (accepted) {
        try {
            const teamDocRef = doc(db, "teams", teamId);
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Team does not exist anymore.");

            const teamData = teamDoc.data() as Team;
            if (teamData.members.length >= 5) {
                toast({ title: "Team Full", description: "This team has already reached the maximum number of members.", variant: "destructive" });
                batch.update(invitationRef, { status: "rejected" });
                await batch.commit();
                setIsProcessing(null);
                return;
            }

            // 1. Add member to the team
            batch.update(teamDocRef, {
                members: [...teamData.members, {
                    uid: user.uid,
                    name: user.name,
                    email: user.email,
                    enrollmentNumber: user.enrollmentNumber,
                    contactNumber: user.contactNumber,
                    gender: user.gender,
                    semester: user.semester,
                    yearOfStudy: user.yearOfStudy,
                }]
            });
            
            // 2. Update user's profile
            const userDocRef = doc(db, "users", user.uid);
            batch.update(userDocRef, { teamId: teamId });
            
            // 3. Update invitation status
            batch.update(invitationRef, { status: "accepted" });

            await batch.commit();
            toast({ title: "Invitation Accepted!", description: "You have successfully joined the team." });

        } catch (error: any) {
            toast({ title: "Error accepting invitation", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(null);
        }
    } else { // Rejected
        try {
            batch.update(invitationRef, { status: "rejected" });
            await batch.commit();
            toast({ title: "Invitation Rejected", description: "You have rejected the team invitation." });
        } catch(error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
             setIsProcessing(null);
        }
    }
  };


  if (authLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="text-primary"/> My Invitations
          </CardTitle>
          <CardDescription>Checking for any pending team invitations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't render the card if there are no invitations
  }

  return (
    <Card className="border-primary/50 animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="text-primary"/> You're Invited!
        </CardTitle>
        <CardDescription>You have a pending invitation to join a team. Please complete your profile first if you haven't already.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map(invite => (
          <div key={invite.id} className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-secondary/30">
            <div>
              <p className="text-sm">You have been invited to join</p>
              <p className="font-semibold text-lg">{invite.teamName}</p>
            </div>
            <div className="flex gap-2 self-end sm:self-center">
              <Button 
                onClick={() => handleInvitation(invite.id, invite.teamId, true)} 
                disabled={isProcessing === invite.id || !user?.enrollmentNumber}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing === invite.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                <span className="ml-2">Accept</span>
              </Button>
              <Button 
                onClick={() => handleInvitation(invite.id, invite.teamId, false)} 
                disabled={isProcessing === invite.id}
                size="sm"
                variant="destructive"
              >
                <X className="h-4 w-4 mr-2" /> Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
