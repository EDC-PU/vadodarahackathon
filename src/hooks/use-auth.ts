
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
        if (team.leader.email.toLowerCase() === email.toLowerCase()) return team;
        const member = team.members.find(m => m.email.toLowerCase() === email.toLowerCase());
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
     // First, check if the user needs to change their password
     if (userProfile.passwordChanged === false) {
        router.push('/change-password');
        return;
     }

     // Then, check if the user has completed their profile
     if ((userProfile.role === 'member' || userProfile.role === 'leader') && !userProfile.enrollmentNumber) {
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
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
            
            if (user?.teamId && !userProfile.teamId) {
                toast({
                    title: "Removed from Team",
                    description: "The team leader has removed you from the team. You can now register as a new leader.",
                    variant: "destructive"
                });
                setUser({ ...userProfile, teamId: undefined });
                router.push('/register');
                return;
            }

            setUser(userProfile);
          } else {
             // If user doc doesn't exist, handleLogin will be responsible for creating it
             // This can happen if a user authenticates but their Firestore doc creation fails
             // We don't set user to null here to allow handleLogin to do its job.
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
    let userDoc = await getDoc(userDocRef);

    // Super Admin Check
    // Note: This requires ADMIN_EMAIL to be set in environment variables.
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail && loggedInUser.email === adminEmail) {
        if (!userDoc.exists()) {
            console.log("Admin user does not exist in Firestore. Creating...");
            const adminProfile: UserProfile = {
                uid: loggedInUser.uid,
                name: "Super Admin",
                email: loggedInUser.email!,
                role: 'admin',
                photoURL: loggedInUser.photoURL || '',
                institute: 'Parul University',
                department: 'Administration',
                enrollmentNumber: 'N/A',
                contactNumber: 'N/A',
                gender: 'Other',
                passwordChanged: true,
            };
            await setDoc(userDocRef, adminProfile);
            userDoc = await getDoc(userDocRef); // Re-fetch the document
        } else {
            // Ensure the role is admin if the doc already exists
            const userProfile = userDoc.data() as UserProfile;
            if (userProfile.role !== 'admin') {
                await updateDoc(userDocRef, { role: 'admin' });
            }
        }
    }

    if (userDoc.exists()) {
      const userProfile = userDoc.data() as UserProfile;
      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
      });
      redirectToDashboard(userProfile);
    } else {
        // User document doesn't exist for the current UID.
        // Check if a user profile exists with this email (e.g., created by an admin or leader).
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", loggedInUser.email!));
        const userSnapshot = await getDocs(q);

        if (!userSnapshot.empty) {
            // A profile with this email exists. Let's link it to the new auth UID.
            const existingUserDoc = userSnapshot.docs[0];
            const userProfile = existingUserDoc.data() as UserProfile;

            const oldDocRef = doc(db, 'users', existingUserDoc.id);
            const newDocRef = doc(db, 'users', loggedInUser.uid);
            const batch = writeBatch(db);
            
            const finalProfile = { ...userProfile, uid: loggedInUser.uid, photoURL: loggedInUser.photoURL || userProfile.photoURL || '' };
            batch.set(newDocRef, finalProfile);

            if (existingUserDoc.id !== loggedInUser.uid) {
               batch.delete(oldDocRef);
            }
            await batch.commit();

            toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
            redirectToDashboard(finalProfile);

        } else {
            // No profile exists. Maybe they are a newly added team member?
            const team = await findTeamByMemberEmail(loggedInUser.email!);
            if (team) {
                const memberDetails = team.members.find(m => m.email.toLowerCase() === loggedInUser.email!.toLowerCase())!;
                const newProfile: UserProfile = {
                    uid: loggedInUser.uid,
                    name: loggedInUser.displayName || memberDetails.name,
                    email: loggedInUser.email!,
                    role: 'member',
                    institute: team.institute,
                    department: '', // To be filled out
                    enrollmentNumber: '', // To be filled out
                    contactNumber: '', // To be filled out
                    gender: "Other", 
                    teamId: team.id,
                    photoURL: loggedInUser.photoURL || '',
                    passwordChanged: false, // Force password change
                };
                
                await setDoc(userDocRef, newProfile);
                
                toast({ title: "Welcome!", description: "Please complete your profile information." });
                redirectToDashboard(newProfile);
            } else {
                 toast({
                    title: "Registration Required",
                    description: "Your account was not found. Please complete the registration form.",
                    variant: "destructive",
                });
                await signOut(auth); // Sign out to prevent being stuck in a logged-in but no-profile state
                router.push('/register'); // Redirect to registration page
            }
        }
    }
  }, [redirectToDashboard, toast, router]);

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
