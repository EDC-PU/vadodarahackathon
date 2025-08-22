
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, writeBatch, updateDoc, setDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, Team } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from './use-toast';
import { getAdminAuth } from '@/lib/firebase-admin';
import { notifyAdminsOfSpocRequest } from '@/ai/flows/notify-admins-flow';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const redirectToDashboard = useCallback((userProfile: UserProfile) => {
     console.log("redirectToDashboard: Starting redirection logic for user:", userProfile);
     
     // First, check if the user needs to change their password
     if (userProfile.passwordChanged === false) {
        console.log("redirectToDashboard: User needs to change password. Redirecting to /change-password.");
        router.push('/change-password');
        return;
     }
     
     // Handle pending SPOCs
     if (userProfile.role === 'spoc' && userProfile.spocStatus === 'pending') {
        console.log("redirectToDashboard: SPOC is pending approval. Signing out.");
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
        console.log("redirectToDashboard: SPOC profile is incomplete. Redirecting to /complete-spoc-profile.");
        router.push('/complete-spoc-profile');
        return;
     }

     // If the user is a new signup with role 'leader', they need to create a team
     if (userProfile.role === 'leader' && !userProfile.teamId) {
         console.log("redirectToDashboard: User is a leader but has no team. Redirecting to /create-team.");
         router.push('/create-team');
         return;
     }

     // If the user is a new signup with role 'member', but has no teamId yet (hasn't been added)
     if (userProfile.role === 'member' && !userProfile.teamId && !userProfile.enrollmentNumber) {
        console.log("redirectToDashboard: User is a member but has no team and incomplete profile. Redirecting to /complete-profile.");
        router.push('/complete-profile');
        return;
     }

     // Then, check if the user has completed their profile
     if ((userProfile.role === 'member' || userProfile.role === 'leader') && !userProfile.enrollmentNumber) {
        console.log("redirectToDashboard: Member/Leader profile is incomplete. Redirecting to /complete-profile.");
        router.push('/complete-profile');
        return;
     }

     console.log(`redirectToDashboard: User role is ${userProfile.role}. Redirecting to respective dashboard.`);
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
          console.log("redirectToDashboard: User has unknown role or default case. Redirecting to /register.");
          router.push("/register");
      }
  }, [router, toast]);

  useEffect(() => {
    console.log("useAuth: Setting up onAuthStateChanged listener.");
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        console.log(`useAuth onAuthStateChanged: User is logged in. UID: ${currentUser.uid}`);
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
            console.log("useAuth onSnapshot: User profile data received:", userProfile);
            
            // --- Start of Role-Based Route Protection ---
            if (userProfile.role && !loading) {
              const currentRole = userProfile.role;
              const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/leader') || pathname.startsWith('/spoc') || pathname.startsWith('/member');
              
              if (isProtectedPath) {
                if (pathname.startsWith('/admin') && currentRole !== 'admin') {
                    console.warn(`SECURITY: Role '${currentRole}' attempted to access admin path '${pathname}'. Redirecting.`);
                    redirectToDashboard(userProfile);
                } else if (pathname.startsWith('/leader') && currentRole !== 'leader') {
                    console.warn(`SECURITY: Role '${currentRole}' attempted to access leader path '${pathname}'. Redirecting.`);
                    redirectToDashboard(userProfile);
                } else if (pathname.startsWith('/spoc') && currentRole !== 'spoc') {
                    console.warn(`SECURITY: Role '${currentRole}' attempted to access spoc path '${pathname}'. Redirecting.`);
                    redirectToDashboard(userProfile);
                } else if (pathname.startsWith('/member') && currentRole !== 'member') {
                   console.warn(`SECURITY: Role '${currentRole}' attempted to access member path '${pathname}'. Redirecting.`);
                   redirectToDashboard(userProfile);
                }
              }
            }
            // --- End of Role-Based Route Protection ---


            if (user?.teamId && !userProfile.teamId) {
                console.warn(`useAuth onSnapshot: User was part of team ${user.teamId} but is no longer. Resetting role.`);
                toast({
                    title: "Removed from Team",
                    description: "The team leader or a SPOC has removed you from the team. You can now register as a new leader.",
                    variant: "destructive"
                });
                setUser({ ...userProfile, teamId: undefined, role: 'leader' }); // Default to leader so they can create a new team
                router.push('/create-team');
                return;
            }

            setUser(userProfile);
          } else {
            console.warn(`useAuth onSnapshot: User document for UID ${currentUser.uid} does not exist.`);
          }
           setLoading(false);
           console.log("useAuth: Loading state set to false.");
        }, (error) => {
            console.error("useAuth onSnapshot: Error listening to user profile:", error);
            setUser(null);
            setLoading(false);
        });

        return () => {
            console.log("useAuth: Unsubscribing from user profile snapshot listener.");
            unsubscribeProfile();
        };

      } else {
        console.log("useAuth onAuthStateChanged: User is not logged in.");
        setUser(null);
        setLoading(false);
        console.log("useAuth: Loading state set to false.");
      }
    });

    return () => {
      console.log("useAuth: Unsubscribing from onAuthStateChanged listener.");
      unsubscribeAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Rerun effect when path changes to enforce rules on navigation


  const handleLogin = useCallback(async (loggedInUser: FirebaseUser) => {
    console.log("handleLogin: Starting login process for user:", loggedInUser.email);
    const userDocRef = doc(db, "users", loggedInUser.uid);
    let userDoc = await getDoc(userDocRef);

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail && loggedInUser.email === adminEmail) {
        console.log("handleLogin: User is designated Super Admin.");
        if (!userDoc.exists()) {
            console.log("handleLogin: Super Admin profile does not exist. Creating it now.");
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
                console.log("handleLogin: Existing user is Super Admin but role is not 'admin'. Updating role.");
                await updateDoc(userDocRef, { role: 'admin' });
            }
        }
    }

    let finalUserProfile;
    if (userDoc.exists()) {
      let userProfile = userDoc.data() as UserProfile;
      console.log("handleLogin: User document exists.", userProfile);
      
      finalUserProfile = userProfile;
      
      if (loggedInUser.disabled) {
        console.warn(`handleLogin: Login attempt by disabled user: ${loggedInUser.email}`);
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
      
    } else {
        console.log("handleLogin: New user detected. Creating profile from sessionStorage role.");
        const role = sessionStorage.getItem('sign-up-role');
        sessionStorage.removeItem('sign-up-role');

        if (!role) {
            console.error("handleLogin: New user signed up, but role was not found in sessionStorage.");
            toast({ title: "Error", description: "Role selection was not found. Please try signing up again.", variant: "destructive" });
            signOut(auth);
            return;
        }

        const newProfile: UserProfile = {
            uid: loggedInUser.uid,
            name: loggedInUser.displayName || 'New User',
            email: loggedInUser.email!,
            role: role as UserProfile['role'],
            photoURL: loggedInUser.photoURL || '',
            passwordChanged: loggedInUser.providerData.some(p => p.providerId === 'google.com'), // True for Google, false for email
        };
        
        console.log("handleLogin: Creating new user document with profile:", newProfile);
        await setDoc(doc(db, "users", loggedInUser.uid), newProfile);
        
        finalUserProfile = newProfile;
        
        toast({ title: "Account Created!", description: "Let's complete your profile." });
    }

    redirectToDashboard(finalUserProfile);

  }, [redirectToDashboard, toast]);

  const handleSignOut = useCallback(async () => {
    console.log("handleSignOut: Attempting to sign out user.");
    try {
      await signOut(auth);
      router.push('/login');
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      console.log("handleSignOut: Sign-out successful.");
    } catch (error) {
      console.error("Sign Out Error:", error);
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    }
  }, [router, toast]);
  

  return { user, firebaseUser, loading, handleSignOut, redirectToDashboard, handleLogin };
}
