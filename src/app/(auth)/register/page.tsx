
import { SignupForm } from "@/components/signup-form";
import Image from "next/image";
import Link from "next/link";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAdminDb } from "@/lib/firebase-admin";

async function getRegistrationDeadline() {
    const adminDb = getAdminDb();
    if (!adminDb) {
        console.error("Could not get admin db instance for deadline check.");
        return null;
    }
    try {
        const configDocRef = adminDb.collection("config").doc("event");
        const configDoc = await configDocRef.get();
        if (configDoc.exists() && configDoc.data()?.registrationDeadline) {
            // Return serializable timestamp
            return configDoc.data()?.registrationDeadline.toMillis();
        }
        return null;
    } catch (error) {
        console.error("Error fetching registration deadline on server: ", error);
        return null;
    }
}


export default async function RegisterPage() {
  const deadlineMillis = await getRegistrationDeadline();
  
  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <Link href="/" className="flex items-center gap-2 mb-4">
           <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={64} height={64} />
        </Link>
        <h1 className="text-3xl font-bold font-headline">Create an Account</h1>
        <p className="text-muted-foreground">Join the hackathon by creating your account below.</p>
      </div>
      <SignupForm deadlineMillis={deadlineMillis} />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Login here
        </Link>
      </p>
    </div>
  );
}
