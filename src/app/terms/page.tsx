
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

export default function TermsOfUsePage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
       <div className="w-full max-w-4xl">
         <div className="flex flex-col items-center justify-center text-center mb-8">
            <Link href="/" className="flex items-center gap-2 mb-4">
               <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
            </Link>
            <h1 className="text-3xl font-bold font-headline">Terms of Use</h1>
         </div>
         <Card>
            <CardContent className="p-6 space-y-4 text-muted-foreground">
                <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
                <p>Welcome to the Vadodara Hackathon 6.0 Portal. By accessing or using our service, you agree to be bound by these terms. If you disagree with any part of the terms, then you may not access the service.</p>

                <h2 className="text-xl font-bold text-foreground">2. User Accounts</h2>
                <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service. You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>

                <h2 className="text-xl font-bold text-foreground">3. Intellectual Property</h2>
                <p>The intellectual property rights for the projects and solutions developed during the hackathon remain with the participants. However, by participating, you grant Vadodara Hackathon 6.0 and its organizers a non-exclusive, worldwide, royalty-free license to use, reproduce, and display the submitted work for promotional and non-commercial purposes.</p>

                <h2 className="text-xl font-bold text-foreground">4. Code of Conduct</h2>
                <p>All participants are expected to adhere to a high standard of professional and ethical conduct. Harassment, discrimination, or any form of inappropriate behavior will not be tolerated and may result in disqualification and removal from the event and platform.</p>

                <h2 className="text-xl font-bold text-foreground">5. Termination</h2>
                <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

                <h2 className="text-xl font-bold text-foreground">6. Governing Law</h2>
                <p>These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>

                <h2 className="text-xl font-bold text-foreground">7. Changes</h2>
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
            </CardContent>
         </Card>
       </div>
    </div>
  );
}
