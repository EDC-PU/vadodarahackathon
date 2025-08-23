
"use client";

import { SignupForm } from "@/components/signup-form";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function JoinPageContent() {
    const params = useParams();
    const token = params.token as string;

    return (
        <div className="w-full max-w-md">
            <div className="flex flex-col items-center justify-center text-center mb-8">
                <Link href="/" className="flex items-center gap-2 mb-4">
                <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
                </Link>
                <h1 className="text-3xl font-bold font-headline">Join a Team</h1>
                <p className="text-muted-foreground">Create your account to join the team. Your role is pre-selected as a Team Member.</p>
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

