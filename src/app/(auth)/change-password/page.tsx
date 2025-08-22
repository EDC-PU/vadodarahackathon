
import { ChangePasswordForm } from "@/components/change-password-form";
import Image from "next/image";
import Link from "next/link";

export default function ChangePasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-4">
           <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
        </Link>
        <h1 className="text-3xl font-bold font-headline">Change Your Password</h1>
        <p className="text-muted-foreground">For security, you must change your temporary password before proceeding.</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
