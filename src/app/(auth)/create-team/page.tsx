import { RegistrationForm } from "@/components/registration-form";
import Image from "next/image";
import Link from "next/link";

export default function CreateTeamPage() {
  return (
    <div className="w-full max-w-2xl">
       <div className="flex flex-col items-center justify-center text-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-4">
          <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={48} height={48} />
        </Link>
        <h1 className="text-3xl font-bold font-headline">Create Your Team</h1>
        <p className="text-muted-foreground">Welcome, leader! Fill out your team and personal details to get started.</p>
      </div>
      <RegistrationForm />
    </div>
  );
}
