
import { LoginForm } from "@/components/login-form";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-4">
           <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={512} height={128} />
        </Link>
        <h1 className="text-3xl font-bold font-headline">Welcome Back</h1>
        <p className="text-muted-foreground">Enter your credentials to access your dashboard.</p>
      </div>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account yet?{" "}
        <Link href="/register-2" className="font-medium text-primary hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}
