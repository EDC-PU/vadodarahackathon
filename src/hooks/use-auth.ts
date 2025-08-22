
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, writeBatch, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, Team } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

async function findTeamByMemberEmail(email: string): Promise<Team | null> {
    if (!email) return null;
    const teamsRef = collection(db, "teams");
    const querySnapshot = await getDocs(teamsRef);

    for (const doc of querySnapshot.docs) {
        const team = { id: doc.id, ...doc.data() } as Team;
        // Check both leader and members
        if (team.leader.email === email) return team;
        const member = team.members.find(m => m.email === email);
        if (member) {
            return team;
        }
    }
    return null;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const redirectToDashboard = useCallback((userProfile: UserProfile) => {
     // Check if the user has completed their profile
     if (userProfile.role === 'member' && !userProfile.enrollmentNumber) {
        router.push('/complete-profile');
        return;
     }

     switch (userProfile.role) {
        case "admin":
          router.push("/admin");
          break;
        case "leader":
          router.push("/leader");
          break;
        case "spoc":
          router.push("/spoc");
          break;
        case "member":
          router.push("/member");
          break;
        default:
          router.push("/login");
      }
  }, [router]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
            
            // If the user was a member and their teamId was just removed
            if (user?.teamId && !userProfile.teamId) {
                toast({
                    title: "Removed from Team",
                    description: "The team leader has removed you from the team. You can now register as a new leader.",
                    variant: "destructive"
                });
                // No need to sign out, just update state and let them decide what to do next
                // They can now go to /register
                setUser({ ...userProfile, teamId: undefined });
                router.push('/register'); // Redirect them to registration
                return;
            }

            setUser(userProfile);
          } else {
             setUser(null);
          }
           setLoading(false);
        }, (error) => {
            console.error("Error listening to user profile:", error);
            setUser(null);
            setLoading(false);
        });

        return () => unsubscribeProfile();

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleLogin = useCallback(async (loggedInUser: FirebaseUser) => {
    const userDocRef = doc(db, "users", loggedInUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userProfile = userDoc.data() as UserProfile;
      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
      });
      redirectToDashboard(userProfile);
    } else {
        // User document doesn't exist for the current UID.
        // Let's check if a user profile exists with this email (e.g., created by an admin).
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", loggedInUser.email!));
        const userSnapshot = await getDocs(q);

        if (!userSnapshot.empty) {
            // A profile with this email exists. Let's link it to the new auth UID.
            const existingUserDoc = userSnapshot.docs[0];
            const userProfile = existingUserDoc.data() as UserProfile;

            // This handles cases where the doc ID is not the same as the auth UID (e.g. SPOC creation)
            const oldDocRef = doc(db, 'users', existingUserDoc.id);
            const newDocRef = doc(db, 'users', loggedInUser.uid);
            const batch = writeBatch(db);
            
            batch.set(newDocRef, { ...userProfile, uid: loggedInUser.uid, photoURL: loggedInUser.photoURL || userProfile.photoURL || '' });
            // Only delete the old doc if the ID is different.
            if (existingUserDoc.id !== loggedInUser.uid) {
               batch.delete(oldDocRef);
            }
            await batch.commit();

            toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
            redirectToDashboard({ ...userProfile, uid: loggedInUser.uid });

        } else {
            // No profile exists. Maybe they are a newly added team member?
            const team = await findTeamByMemberEmail(loggedInUser.email!);
            if (team) {
                const memberDetails = team.members.find(m => m.email === loggedInUser.email)!;
                const newProfile: UserProfile = {
                    uid: loggedInUser.uid,
                    name: loggedInUser.displayName || memberDetails.name,
                    email: loggedInUser.email!,
                    role: 'member',
                    institute: team.institute,
                    // These will be filled out on the complete-profile page
                    department: '',
                    enrollmentNumber: '',
                    contactNumber: '',
                    gender: "Other", 
                    teamId: team.id,
                };
                
                await setDoc(userDocRef, newProfile);
                
                toast({ title: "Welcome!", description: "Please complete your profile information." });
                redirectToDashboard(newProfile);
            } else {
                 // No profile and not a team member. They must register.
                 toast({
                    title: "Registration Incomplete",
                    description: "Your account is not associated with a team or role. Please register first.",
                    variant: "destructive",
                });
                await signOut(auth);
            }
        }
    }
  }, [redirectToDashboard, toast]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      router.push('/login');
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
    } catch (error) {
      console.error("Sign Out Error:", error);
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    }
  }, [router, toast]);
  

  return { user, firebaseUser, loading, handleSignOut, redirectToDashboard, handleLogin };
}
