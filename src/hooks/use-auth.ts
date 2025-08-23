
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, writeBatch, updateDoc, setDoc, arrayUnion, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, Team, TeamInvite } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from './use-toast';
import { addMemberToTeam } from '@/ai/flows/add-member-to-team-flow';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const reloadUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    console.log("reloadUser: Forcing refetch of user profile.");
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
        setUser(userProfile);
        // This will trigger the redirect logic in the useEffect below
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    console.log("handleSignOut: Attempting to sign out user.");
    try {
      await signOut(auth);
      router.push('/');
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      console.log("handleSignOut: Sign-out successful.");
    } catch (error) {
      console.error("Sign Out Error:", error);
      toast({ title: "Error", description: "Failed to sign out.", variant: "destructive" });
    }
  }, [router, toast]);

  const redirectToDashboard = useCallback((userToRedirect: UserProfile | null) => {
    if (!userToRedirect) {
      router.push('/login');
      return;
    }
  
    let path = `/${userToRedirect.role}`;
    console.log(`Redirecting to dashboard: ${path}`);
    router.push(path);
  }, [router]);


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
            setUser(userProfile);
          } else {
            console.warn(`useAuth onSnapshot: User document for UID ${currentUser.uid} does not exist.`);
            setUser(null);
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
  }, []);
  

  useEffect(() => {
    if (loading || isNavigating) {
        return;
    }
    
    const performRedirect = (path: string) => {
        if (pathname !== path && !pathname.startsWith('/join/')) {
            setIsNavigating(true);
            router.push(path);
            // Reset navigating state after a short delay
            setTimeout(() => setIsNavigating(false), 1000);
        }
    };
    
    // --- Start of Redirection and Route Protection Logic ---
    if (!user) {
        // If there's no user and we're not on a public page, redirect to login
        const publicPaths = ['/login', '/register', '/forgot-password', '/', '/privacy', '/terms'];
        if (!publicPaths.includes(pathname) && !pathname.startsWith('/_next/') && !pathname.startsWith('/join/')) {
            console.log(`Redirect Check: No user found, redirecting from protected path ${pathname} to /login.`);
            performRedirect('/login');
        }
        return;
    }

    console.log("Redirect Check: Starting for user:", user);
     
     // 1. Password change check
     if (user.passwordChanged === false) {
        console.log("Redirect Check: User needs to change password.");
        performRedirect('/change-password');
        return;
     }
     
     // 2. SPOC status check
     if (user.role === 'spoc' && user.spocStatus === 'pending') {
        console.log("Redirect Check: SPOC is pending approval. Signing out.");
        handleSignOut();
        toast({
            title: "Pending Approval",
            description: "Your SPOC account is awaiting admin approval. You will be notified via email once it's approved.",
            variant: "default",
            duration: 10000,
        });
        return;
     }
     
     // 3. Profile completion checks
     if (user.role === 'spoc' && (!user.institute || !user.contactNumber)) {
        console.log("Redirect Check: SPOC profile is incomplete.");
        performRedirect('/complete-spoc-profile');
        return;
     }

     if (user.role === 'leader' && !user.teamId) {
         console.log("Redirect Check: User is a leader but has no team.");
         performRedirect('/create-team');
         return;
     }
     
    // This rule is now ignored on the join page to prevent loops.
    if ((user.role === 'member' || user.role === 'leader') && !user.enrollmentNumber && !pathname.startsWith('/join/')) {
        console.log("Redirect Check: Member/Leader profile is incomplete.");
        performRedirect('/complete-profile');
        return;
    }
    
    // 4. Role-based route protection
    const currentRole = user.role;
    if (!currentRole) return; // Exit if role is not yet defined
    const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/leader') || pathname.startsWith('/spoc') || pathname.startsWith('/member') || pathname.startsWith('/profile');
              
    if (isProtectedPath) {
        // Allow access to own profile regardless of role
        if (pathname.startsWith('/profile/')) {
            if (user.enrollmentNumber && pathname.endsWith(user.enrollmentNumber)) {
                return;
            }
        }
        
        if (!pathname.startsWith(`/${currentRole}`)) {
             console.warn(`SECURITY: Role '${currentRole}' attempted to access '${pathname}'. Redirecting.`);
             performRedirect(`/${currentRole}`);
        }
    } else if (['/login', '/register', '/create-team', '/complete-profile', '/complete-spoc-profile', '/change-password'].includes(pathname)) {
        // If user is on an auth/setup page but should be on their dashboard
        console.log(`Redirect Check: User is on setup page '${pathname}', redirecting to their dashboard.`);
        performRedirect(`/${currentRole}`);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname, router, handleSignOut]);


  const handleLogin = useCallback(async (loggedInUser: FirebaseUser, inviteToken?: string) => {
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
                createdAt: serverTimestamp() as any,
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
    
    let userProfile: UserProfile;

    if (userDoc.exists()) {
      userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
      console.log("handleLogin: User document exists.", userProfile);
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
        
        if (inviteToken) {
            console.log("Storing invite token in session storage for after profile completion.");
            sessionStorage.setItem('inviteToken', inviteToken);
        }

        userProfile = {
            uid: loggedInUser.uid,
            name: loggedInUser.displayName || '',
            email: loggedInUser.email!,
            role: role as UserProfile['role'],
            photoURL: loggedInUser.photoURL || '',
            passwordChanged: true, // User set their own password during signup
            createdAt: serverTimestamp() as any,
        };
        
        await setDoc(userDocRef, userProfile);
        toast({ title: "Account Created!", description: "Let's complete your profile." });
        console.log("handleLogin: Creating new user document with profile:", userProfile);
    }
    
    toast({
        title: userDoc.exists() ? "Login Successful" : "Account Created",
        description: "Redirecting...",
    });

    setUser(userProfile); // This will trigger the redirect useEffect

  }, [toast]);
  

  return { user, firebaseUser, loading, handleSignOut, handleLogin, reloadUser, redirectToDashboard };
}
