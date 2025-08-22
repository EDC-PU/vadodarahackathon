
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
        // SPOC is pending approval, don't redirect to dashboard.
        // The login form will handle showing the message.
        // We can sign them out and show a toast.
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
           // If role is somehow null or undefined, send to create a team
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
          } else {
             // If user doc doesn't exist, handleLogin will be responsible for creating it
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

      // Handle disabled users (pending SPOCs)
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
        // User document doesn't exist. This is a brand new user signing up.
        const signUpForm = JSON.parse(sessionStorage.getItem('sign-up-form') || '{}');
        const { role, name, contactNumber, institute } = signUpForm;
        const newUserName = name || loggedInUser.displayName || 'New User';

        const newProfile: Partial<UserProfile> = {
            uid: loggedInUser.uid,
            name: newUserName,
            email: loggedInUser.email!,
            role: role,
            photoURL: loggedInUser.photoURL || '',
            passwordChanged: true, // For self-registration, we skip forced password change
        };
        
        let toastTitle = "Account Created!";
        let toastDescription = "Let's get you set up.";

        if (role === 'spoc') {
            newProfile.spocStatus = 'pending';
            newProfile.contactNumber = contactNumber;
            newProfile.institute = institute;
            toastTitle = "Registration Submitted";
            toastDescription = "Your request has been sent for admin approval. You will be notified via email.";

            // Notify admins
            notifyAdminsOfSpocRequest({
                spocName: newUserName,
                spocEmail: loggedInUser.email!,
                spocInstitute: institute,
            }).then(result => {
                if (!result.success) {
                    console.error("Failed to send admin notification:", result.message);
                    // Non-critical error, so we don't need to block the user.
                    // We can log this for monitoring.
                }
            });
        }

        await setDoc(doc(db, "users", loggedInUser.uid), newProfile);
        sessionStorage.removeItem('sign-up-form');
        
        toast({ title: toastTitle, description: toastDescription });
        
        if (role === 'spoc') {
            signOut(auth);
            router.push('/login');
        } else {
            redirectToDashboard(newProfile as UserProfile);
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
