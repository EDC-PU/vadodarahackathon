
'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, Team } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

async function findTeamByMemberEmail(email: string): Promise<Team | null> {
    const teamsRef = collection(db, "teams");
    const querySnapshot = await getDocs(teamsRef);

    for (const doc of querySnapshot.docs) {
        const team = { id: doc.id, ...doc.data() } as Team;
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Listen for real-time updates to the user's document
        const unsubscribeProfile = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
            
            // If the user is a member and their teamId was just removed, log them out.
            if (user?.role === 'member' && user.teamId && !userProfile.teamId) {
                toast({
                    title: "Removed from Team",
                    description: "The team leader has removed you from the team.",
                    variant: "destructive"
                });
                handleSignOut();
                return;
            }

            setUser(userProfile);
          } else {
            // This can happen if a user is in Auth but their Firestore doc is deleted.
            // Or if they are a new user signing up.
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

  const redirectToDashboard = useCallback((userProfile: UserProfile) => {
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
        // This is a new sign in via Google that doesn't have a profile yet,
        // or a member who hasn't been fully registered in the 'users' collection.
        // We check if they were added to a team by email.
        const team = await findTeamByMemberEmail(loggedInUser.email!);
        if (team) {
            // Create user profile for this member
            const batch = writeBatch(db);
            const memberDetails = team.members.find(m => m.email === loggedInUser.email)!;

            const newProfile: UserProfile = {
                uid: loggedInUser.uid,
                name: memberDetails.name,
                email: memberDetails.email,
                role: 'member',
                institute: team.institute,
                department: team.department,
                enrollmentNumber: memberDetails.enrollmentNumber,
                contactNumber: memberDetails.contactNumber,
                gender: memberDetails.gender,
                teamId: team.id,
            };
            
            // Update the member's placeholder UID in the team's array to their actual UID
            const updatedMembers = team.members.map(m => 
                m.email === loggedInUser.email ? { ...m, uid: loggedInUser.uid } : m
            );
            const teamDocRef = doc(db, "teams", team.id);
            batch.update(teamDocRef, { members: updatedMembers });

            batch.set(userDocRef, newProfile);
            await batch.commit();

            toast({ title: "Welcome!", description: "Your account is set up. Redirecting..." });
            redirectToDashboard(newProfile);
        } else {
            // This is a user (likely an admin) created in the console who is logging in for the first time.
            // Or someone who is not on a team trying to log in.
            // Let's check if an admin document exists for this email.
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", loggedInUser.email!), where("role", "==", "admin"));
            const adminSnapshot = await getDocs(q);

            if (!adminSnapshot.empty) {
                const adminDoc = adminSnapshot.docs[0];
                const adminProfile = adminDoc.data() as UserProfile;
                 // It's possible the UID is different if created manually vs. Google Sign-In
                // We should update the UID in firestore to match the authenticated user
                if (adminDoc.id !== loggedInUser.uid) {
                    const oldDocRef = doc(db, 'users', adminDoc.id);
                    const newDocRef = doc(db, 'users', loggedInUser.uid);
                    const batch = writeBatch(db);
                    batch.set(newDocRef, {...adminProfile, uid: loggedInUser.uid });
                    batch.delete(oldDocRef);
                    await batch.commit();
                }

                toast({ title: "Admin Login Successful", description: "Redirecting to your dashboard..." });
                redirectToDashboard(adminProfile);
            } else {
                 toast({
                    title: "Registration Incomplete",
                    description: "Your account is not associated with a team. Please register first.",
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
