
"use client";

import { SignupForm } from "@/components/signup-form";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { getInviteDetails } from "@/ai/flows/get-invite-details-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { addMemberToTeam } from "@/ai/flows/add-member-to-team-flow";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc, collection, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TeamInfo {
    teamName: string;
    leaderName: string;
    teamId: string;
}

function JoinPageContent() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;
    
    const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingJoin, setProcessingJoin] = useState(false);
    const [joinCompleted, setJoinCompleted] = useState(false);
    
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        // Check if we just completed a join process from profile completion
        const justCompletedJoin = sessionStorage.getItem('justCompletedJoin');
        if (justCompletedJoin === 'true') {
            sessionStorage.removeItem('justCompletedJoin');
            // Redirect to dashboard instead of processing join again
            router.push(user?.role === 'leader' ? '/leader' : '/member');
            return;
        }

        const processJoinRequest = async () => {
            if (!token) {
                setError("Invalid invitation link.");
                setLoading(false);
                return;
            }
            if (authLoading || processingJoin || joinCompleted) {
                return; 
            }

            setLoading(true);
            try {
                // First, get the invite details
                const inviteResult = await getInviteDetails({ inviteId: token });
                if (!inviteResult.success || !inviteResult.teamId || !inviteResult.teamName || !inviteResult.leaderName) {
                    throw new Error(inviteResult.message || "Could not validate the invitation.");
                }
                const currentTeamInfo = { teamId: inviteResult.teamId, teamName: inviteResult.teamName, leaderName: inviteResult.leaderName };
                setTeamInfo(currentTeamInfo);

                // If user is logged in, handle them
                if (user) {
                    // Check if user is already on a team
                    if (user.teamId) {
                         setError("You are already on a team. To join a new team, you must first be removed from your current one.");
                         setLoading(false);
                         return;
                    }
                    // Check if profile is complete
                    if (!user.enrollmentNumber) {
                        // Profile is not complete, redirect to complete it.
                        // Store token so we can add them to team after profile completion.
                        sessionStorage.setItem('inviteToken', token);
                        toast({ title: "Profile Incomplete", description: "Please complete your profile to join the team.", variant: "default" });
                        router.push('/complete-profile');
                        return; // Stop execution here
                    }
                    
                    // Profile is complete, proceed to join team
                    setProcessingJoin(true);
                    const joinResult = await addMemberToTeam({
                        userId: user.uid,
                        teamId: currentTeamInfo.teamId,
                        name: user.name,
                        email: user.email,
                        enrollmentNumber: user.enrollmentNumber,
                        contactNumber: user.contactNumber,
                        gender: user.gender,
                        semester: user.semester,
                        yearOfStudy: user.yearOfStudy
                    });

                    if (joinResult.success) {
                        // Create notification for the leader
                        const teamDocRef = doc(db, 'teams', currentTeamInfo.teamId);
                        const teamDoc = await getDoc(teamDocRef);
                        const leaderId = teamDoc.data()?.leader.uid;

                        if(leaderId) {
                            const notificationsCollectionRef = collection(db, 'notifications');
                            const newNotificationRef = doc(notificationsCollectionRef);
                            await setDoc(newNotificationRef, {
                                recipientUid: leaderId,
                                title: "New Member Joined!",
                                message: `${user.name} has joined your team, "${currentTeamInfo.teamName}".`,
                                read: false,
                                createdAt: new Date(),
                                link: '/leader'
                            });
                        }

                        toast({ title: "Success!", description: `You have joined ${currentTeamInfo.teamName}.` });
                        setJoinCompleted(true);
                        router.push('/member');
                    } else {
                        setError(joinResult.message);
                        setProcessingJoin(false);
                    }
                }
                
            } catch (err: any) {
                console.error("Error processing join request:", err);
                setError(err.message || "An unexpected error occurred.");
                setProcessingJoin(false);
            } finally {
                // Only stop loading if user is not logged in, otherwise they get redirected.
                if (!user) {
                    setLoading(false);
                }
            }
        };

        processJoinRequest();
    }, [token, user, authLoading, router, toast, processingJoin, joinCompleted]);

    if (loading || authLoading) {
        return (
             <div className="flex flex-col items-center justify-center text-center gap-4 w-full max-w-md">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">{user ? "Joining team..." : "Loading invitation..."}</p>
            </div>
        );
    }
    
    if (error) {
        return (
             <Alert variant="destructive" className="w-full max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Joining Team</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <Button variant="link" asChild className="p-0 h-auto mt-2">
                    <Link href="/leader">Go to Dashboard</Link>
                </Button>
            </Alert>
        )
    }

    // If user is not logged in, show the signup form
    if (!user) {
        return (
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                    <Link href="/" className="flex items-center gap-2 mb-4">
                    <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
                    </Link>
                    <h1 className="text-3xl font-bold font-headline">Join {teamInfo?.teamName || 'the Team'}</h1>
                    <p className="text-muted-foreground">
                        {teamInfo?.leaderName} has invited you to join their team. Create your account to accept the invitation.
                    </p>
                </div>
                <SignupForm inviteToken={token} />
                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                    Login here
                    </Link>
                </p>
            </div>
        )
    }
    
    // Fallback for logged-in users while redirecting
    return (
        <div className="flex flex-col items-center justify-center text-center gap-4 w-full max-w-md">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
    )
}


export default function JoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
            <JoinPageContent />
        </Suspense>
    </div>
  );
}
