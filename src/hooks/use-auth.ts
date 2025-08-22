
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, writeBatch, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, Team } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';
import { getAdminAuth } from '@/lib/firebase-admin';
import { notifyAdminsOfSpocRequest } from '@/ai/flows/notify-admins-flow';

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
     
     // Handle pending SPOCs
     if (userProfile.role === 'spoc' && userProfile.spocStatus === 'pending') {
        signOut(auth);
        toast({
            title: "Pending Approval",
            description: "Your SPOC account is awaiting admin approval. You will be notified via email once it's approved.",
            variant: "default",
            duration: 10000,
        });
        router.push('/login');
        return;
     }
     
      // If SPOC hasn't completed their profile
     if (userProfile.role === 'spoc' && (!userProfile.institute || !userProfile.contactNumber)) {
        router.push('/complete-spoc-profile');
        return;
     }

     // If the user is a new signup with no role, they need to create a team
     if (!userProfile.role) {
         router.push('/create-team');
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
          router.push("/create-team");
      }
  }, [router, toast]);

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
                setUser({ ...userProfile, teamId: undefined, role: undefined });
                router.push('/create-team');
                return;
            }

            setUser(userProfile);
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

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail && loggedInUser.email === adminEmail) {
        if (!userDoc.exists()) {
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
            userDoc = await getDoc(userDocRef);
        } else {
            const userProfile = userDoc.data() as UserProfile;
            if (userProfile.role !== 'admin') {
                await updateDoc(userDocRef, { role: 'admin' });
            }
        }
    }

    if (userDoc.exists()) {
      const userProfile = userDoc.data() as UserProfile;

      if (loggedInUser.disabled) {
        toast({
            title: "Account Pending Approval",
            description: "Your SPOC account is awaiting admin approval. Please check back later.",
            variant: "destructive",
            duration: 8000,
        });
        signOut(auth);
        return;
      }
      
      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
      });
      redirectToDashboard(userProfile);
    } else {
        const role = sessionStorage.getItem('sign-up-role');
        sessionStorage.removeItem('sign-up-role');

        if (!role) {
            toast({ title: "Error", description: "Role selection was not found. Please try signing up again.", variant: "destructive" });
            signOut(auth);
            return;
        }

        const newProfile: Partial<UserProfile> = {
            uid: loggedInUser.uid,
            name: loggedInUser.displayName || 'New User',
            email: loggedInUser.email!,
            role: role as UserProfile['role'],
            photoURL: loggedInUser.photoURL || '',
            passwordChanged: true, 
        };
        
        await setDoc(doc(db, "users", loggedInUser.uid), newProfile);
        
        toast({ title: "Account Created!", description: "Let's complete your profile." });
        
        redirectToDashboard(newProfile as UserProfile);
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
