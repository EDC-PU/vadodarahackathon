import LandingPage from "@/components/landing-page";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAdminDb } from "@/lib/firebase-admin";
import { UserProfile } from "@/lib/types";

async function getSpocDetails() {
  const db = getAdminDb();
  if (!db) {
    console.error("Could not get admin db instance.");
    return {};
  }
  try {
    const spocQuery = db.collection("users").where("role", "==", "spoc").where("spocStatus", "==", "approved");
    const querySnapshot = await spocQuery.get();
    const spocs: { [key: string]: { name: string; email: string; contact: string } } = {};
    querySnapshot.forEach(doc => {
      const spocData = doc.data() as UserProfile;
      if (spocData.institute) {
        spocs[spocData.institute] = {
          name: spocData.name,
          email: spocData.email,
          contact: spocData.contactNumber!,
        };
      }
    });
    return spocs;
  } catch (error) {
    console.error("Error fetching SPOCs on server: ", error);
    return {};
  }
}

export default async function Home() {
  const spocDetails = await getSpocDetails();

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <LandingPage spocDetails={spocDetails} />
    </Suspense>
  );
}
