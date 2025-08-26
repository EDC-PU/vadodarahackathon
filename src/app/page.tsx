
import LandingPage from "@/components/landing-page";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAdminDb } from "@/lib/firebase-admin";
import { Announcement, ProblemStatement, UserProfile } from "@/lib/types";
import { Timestamp } from "firebase-admin/firestore";

async function getSpocDetails() {
  const db = getAdminDb();
  if (!db) {
    console.error("Could not get admin db instance for SPOCs.");
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

async function getPublicAnnouncements() {
  const db = getAdminDb();
  if (!db) {
    console.error("Could not get admin db instance for Announcements.");
    return [];
  }
  try {
    const announcementsCollection = db.collection('announcements');
    const q = announcementsCollection
        .where("audience", "==", "all")
        .orderBy("createdAt", "desc")
        .limit(5);
    
    const snapshot = await q.get();
    if (snapshot.empty) {
        return [];
    }

    const announcements = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt as Timestamp; // Cast to Firestore Timestamp
        return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to a serializable format (plain object)
            createdAt: createdAt ? {
                seconds: createdAt.seconds,
                nanoseconds: createdAt.nanoseconds,
            } : null,
        } as Announcement;
    });
    return announcements;
  } catch (error) {
    console.error("Error fetching announcements on server: ", error);
    return [];
  }
}

async function getProblemStatements() {
    const db = getAdminDb();
    if (!db) {
        console.error("Could not get admin db instance for Problem Statements.");
        return [];
    }
    try {
        const psCollection = db.collection('problemStatements');
        const q = psCollection.orderBy("problemStatementId");
        const snapshot = await q.get();
        if (snapshot.empty) {
            return [];
        }
        // Serialize Timestamps before returning data
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt as Timestamp | undefined;
            return { 
                id: doc.id, 
                ...data,
                // Ensure createdAt is serialized if it exists
                createdAt: createdAt ? { seconds: createdAt.seconds, nanoseconds: createdAt.nanoseconds } : null,
            } as ProblemStatement;
        });
    } catch (error) {
        console.error("Error fetching problem statements on server: ", error);
        return [];
    }
}

export default async function Home() {
  const spocDetails = await getSpocDetails();
  const announcements = await getPublicAnnouncements();
  const problemStatements = await getProblemStatements();

  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <LandingPage spocDetails={spocDetails} announcements={announcements} problemStatements={problemStatements} />
    </Suspense>
  );
}
