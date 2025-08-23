
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
       <div className="w-full max-w-4xl">
         <div className="flex flex-col items-center justify-center text-center mb-8">
            <Link href="/" className="flex items-center gap-2 mb-4">
               <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
            </Link>
            <h1 className="text-3xl font-bold font-headline">Privacy Policy</h1>
         </div>
         <Card>
             <CardContent className="p-6 space-y-4 text-muted-foreground">
                <h2 className="text-xl font-bold text-foreground">1. Information Collection</h2>
                <p>We collect personal information that you provide to us directly when you register for an account. This information includes your name, email address, contact number, institute, department, and other academic details required for participation in the hackathon.</p>

                <h2 className="text-xl font-bold text-foreground">2. Use of Information</h2>
                <p>The information we collect is used for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>To create and manage your account.</li>
                    <li>To communicate with you about the hackathon, including updates, announcements, and support.</li>
                    <li>To verify your identity and eligibility for participation.</li>
                    <li>To facilitate team formation and management.</li>
                    <li>For internal administrative and analytical purposes.</li>
                </ul>

                <h2 className="text-xl font-bold text-foreground">3. Information Sharing and Disclosure</h2>
                <p>We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website or conducting our business, so long as those parties agree to keep this information confidential. We may also release your information when we believe release is appropriate to comply with the law, enforce our site policies, or protect ours or others' rights, property, or safety.</p>

                <h2 className="text-xl font-bold text-foreground">4. Data Security</h2>
                <p>We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential.</p>
                
                <h2 className="text-xl font-bold text-foreground">5. Data Retention</h2>
                <p>We will retain your personal information for as long as your account is active or as needed to provide you services and to comply with our legal obligations, resolve disputes, and enforce our agreements.</p>

                <h2 className="text-xl font-bold text-foreground">6. Your Rights</h2>
                <p>You have the right to access, update, or delete your personal information at any time by logging into your account and visiting your profile page. Please note that some information may be retained in our records for legal and administrative purposes.</p>

                <h2 className="text-xl font-bold text-foreground">7. Changes to This Policy</h2>
                <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
            </CardContent>
         </Card>
       </div>
    </div>
  );
}
