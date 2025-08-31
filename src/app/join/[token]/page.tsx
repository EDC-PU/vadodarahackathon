
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
        const processJoin = async () => {
            // Prevent processing if auth is still loading, no token is present, or an error has occurred.
            if (authLoading || !token || error) {
                if(!token) setLoading(false);
                return;
            }

            // Check if we just completed this join flow to prevent loops
            const justCompleted = sessionStorage.getItem('justCompletedJoin');
            if (justCompleted === token) {
                console.log("Join flow already completed for this token, redirecting to dashboard.");
                setJoinCompleted(true);
                // No need to remove item here, as a page refresh would be a new attempt.
                return;
            }

            // If user is not logged in, fetch invite details for the signup form
            if (!user) {
                try {
                    const inviteResult = await getInviteDetails({ inviteId: token });
                    if (!inviteResult.success || !inviteResult.teamId || !inviteResult.teamName || !inviteResult.leaderName) {
                        throw new Error(inviteResult.message || "Could not validate the invitation.");
                    }
                    setTeamInfo({ teamId: inviteResult.teamId, teamName: inviteResult.teamName, leaderName: inviteResult.leaderName });
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
                return;
            }

            // --- User is logged in, start the join process ---
            setProcessingJoin(true);

            try {
                // 1. Get Invite Details
                const inviteResult = await getInviteDetails({ inviteId: token });
                 if (!inviteResult.success || !inviteResult.teamId) {
                    throw new Error(inviteResult.message || "Could not validate the invitation.");
                }
                const { teamId, teamName } = inviteResult;
                
                // 2. Check if user is already on THIS team
                if (user.teamId === teamId) {
                    toast({ title: "Already a Member", description: `You are already a member of ${teamName}.` });
                    sessionStorage.setItem('justCompletedJoin', token); // Set flag to prevent loop on redirect
                    router.push('/member');
                    return;
                }
                
                // 3. Check if user is on ANOTHER team
                if (user.teamId && user.teamId !== teamId) {
                    throw new Error("You are already on another team. To join a new team, you must first leave your current one.");
                }
                
                // 4. Check if profile is complete
                if (!user.enrollmentNumber) {
                    sessionStorage.setItem('inviteToken', token);
                    toast({ title: "Profile Incomplete", description: "Please complete your profile to join the team.", variant: "default" });
                    router.push('/complete-profile');
                    return;
                }
                
                // 5. Add user to the team
                const joinResult = await addMemberToTeam({
                    userId: user.uid,
                    teamId: teamId,
                    name: user.name,
                    email: user.email,
                    enrollmentNumber: user.enrollmentNumber,
                    contactNumber: user.contactNumber,
                    gender: user.gender,
                    semester: user.semester,
                    yearOfStudy: user.yearOfStudy
                });
                
                if (joinResult.success) {
                    toast({ title: "Success!", description: `You have joined ${teamName}.` });
                    sessionStorage.setItem('justCompletedJoin', token); // Set flag to prevent loop
                    router.push('/member');
                } else {
                    throw new Error(joinResult.message);
                }

            } catch (err: any) {
                console.error("Error processing join request:", err);
                setError(err.message || "An unexpected error occurred.");
                setProcessingJoin(false);
            }
        };

        processJoin();

    }, [token, user, authLoading, router, toast, error]);

    if(joinCompleted) {
        return (
             <div className="flex flex-col items-center justify-center text-center gap-4 w-full max-w-md">
                <CheckCircle className="h-12 w-12 text-green-500"/>
                <p className="text-muted-foreground">Join process complete. Redirecting to your dashboard...</p>
            </div>
        )
    }

    if (authLoading || loading || processingJoin) {
        return (
             <div className="flex flex-col items-center justify-center text-center gap-4 w-full max-w-md">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">{processingJoin ? "Adding you to the team..." : "Loading invitation..."}</p>
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
                    <Link href="/member">Go to Dashboard</Link>
                </Button>
            </Alert>
        )
    }

    // If we reach here, it means user is not logged in and we have teamInfo
    if (!user && teamInfo) {
        return (
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                    <Link href="/" className="flex items-center gap-2 mb-4">
                    <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
                    </Link>
                    <h1 className="text-3xl font-bold font-headline">Join {teamInfo.teamName}</h1>
                    <p className="text-muted-foreground">
                        {teamInfo.leaderName} has invited you to join their team. Create your account to accept the invitation.
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
    
    // Fallback case
    return null;
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
