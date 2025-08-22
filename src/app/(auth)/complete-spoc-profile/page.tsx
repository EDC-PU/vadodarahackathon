
import { CompleteSpocProfileForm } from "@/components/complete-spoc-profile-form";
import Image from "next/image";
import Link from "next/link";

export default function CompleteSpocProfilePage() {
  return (
    <div className="w-full max-w-2xl">
       <div className="flex flex-col items-center justify-center text-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-4">
          <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
        </Link>
        <h1 className="text-3xl font-bold font-headline">Complete Your SPOC Profile</h1>
        <p className="text-muted-foreground">Please provide your details to complete your registration as a Single Point of Contact.</p>
      </div>
      <CompleteSpocProfileForm />
    </div>
  );
}
