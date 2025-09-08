
import { SpocSignupForm } from "@/components/spoc-signup-form";
import Image from "next/image";
import Link from "next/link";

export default async function RegisterSpocPage() {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-4">
           <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
        </Link>
        <h1 className="text-3xl font-bold font-headline">SPOC Registration</h1>
        <p className="text-muted-foreground">Create your account as an Institute Single Point of Contact.</p>
      </div>
      <SpocSignupForm deadlineMillis={null} />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Login here
        </Link>
      </p>
    </div>
  );
}
