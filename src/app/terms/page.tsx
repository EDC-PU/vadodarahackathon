
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
       <div className="w-full max-w-4xl">
         <div className="flex flex-col items-center justify-center text-center mb-8">
            <Link href="/" className="flex items-center gap-2 mb-4">
               <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
            </Link>
            <h1 className="text-3xl font-bold font-headline">Terms of Service</h1>
         </div>
         <Card>
             <CardContent className="p-6 space-y-4 text-muted-foreground">
                <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
                <p>By accessing or using the Vadodara Hackathon Portal, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the portal.</p>

                <h2 className="text-xl font-bold text-foreground">2. User Conduct</h2>
                <p>You agree to use the portal only for lawful purposes. You are responsible for all of your activity in connection with the services. Any fraudulent, abusive, or otherwise illegal activity may be grounds for termination of your right to access or use the services.</p>

                <h2 className="text-xl font-bold text-foreground">3. Registration and Account Security</h2>
                <p>To access certain features of the portal, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. We reserve the right to suspend or terminate your account if any information provided during the registration process or thereafter proves to be inaccurate, not current, or incomplete.</p>

                <h2 className="text-xl font-bold text-foreground">4. Intellectual Property</h2>
                <p>All content and materials available on the portal, including but not limited to text, graphics, website name, code, images, and logos are the intellectual property of the Vadodara Hackathon organizers and are protected by applicable copyright and trademark law. Any inappropriate use, including but not limited to the reproduction, distribution, display or transmission of any content on this site is strictly prohibited, unless specifically authorized.</p>
                
                <h2 className="text-xl font-bold text-foreground">5. Termination</h2>
                <p>We may terminate or suspend your access to our portal immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

                <h2 className="text-xl font-bold text-foreground">6. Limitation of Liability</h2>
                <p>In no event shall the Vadodara Hackathon organizers, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>

                <h2 className="text-xl font-bold text-foreground">7. Changes to These Terms</h2>
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this page.</p>
            </CardContent>
         </Card>
       </div>
    </div>
  );
}
