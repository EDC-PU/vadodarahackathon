
"use client";

import { SignupForm } from "@/components/signup-form";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { getInviteDetails } from "@/ai/flows/get-invite-details-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TeamInfo {
    teamName: string;
    leaderName: string;
}

function JoinPageContent() {
    const params = useParams();
    const token = params.token as string;
    const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInviteInfo = async () => {
            if (!token) {
                setError("Invalid invitation link.");
                setLoading(false);
                return;
            };

            try {
                const result = await getInviteDetails({ inviteId: token });
                if (result.success) {
                    setTeamInfo({
                        teamName: result.teamName!,
                        leaderName: result.leaderName!,
                    });
                } else {
                    throw new Error(result.message);
                }
            } catch (err: any) {
                console.error("Error fetching invite info:", err);
                setError(err.message || "Could not validate the invitation.");
            } finally {
                setLoading(false);
            }
        };

        fetchInviteInfo();
    }, [token]);

    if (loading) {
        return <Loader2 className="h-8 w-8 animate-spin" />;
    }
    
    if (error) {
        return (
             <Alert variant="destructive" className="w-full max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

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


export default function JoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
            <JoinPageContent />
        </Suspense>
    </div>
  );
}
