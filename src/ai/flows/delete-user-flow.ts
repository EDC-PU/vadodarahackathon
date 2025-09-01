
'use server';
/**
 * @fileOverview A flow to delete a user from Firebase Authentication and Firestore, and handle team cleanup.
 */

import { ai } from '@/ai/genkit';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { DeleteUserInput, DeleteUserInputSchema, DeleteUserOutput, DeleteUserOutputSchema, Team, UserProfile } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';


export async function deleteUser(input: DeleteUserInput): Promise<DeleteUserOutput> {
  console.log("Executing deleteUser function...");
  return deleteUserFlow(input);
}


const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async ({ uid }) => {
    console.log(`deleteUserFlow started for UID: ${uid}`);
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: `Failed to delete user: ${errorMessage}` };
    }

    const userDocRef = adminDb.collection('users').doc(uid);

    try {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        // If user document doesn't exist, they might still have an auth account.
        // Proceed to delete from Auth.
        console.warn(`User document for UID ${uid} not found in Firestore. Attempting to delete from Auth.`);
        await adminAuth.deleteUser(uid);
        console.log(`Successfully deleted orphaned user from Firebase Authentication for UID: ${uid}`);
        return { success: true, message: 'User has been successfully deleted.' };
      }
      
      const userProfile = userDoc.data() as UserProfile;
      
      const batch = adminDb.batch();

      // If user is a member of a team, remove them from the team.
      if (userProfile.teamId && userProfile.role === 'member') {
        const teamDocRef = adminDb.collection('teams').doc(userProfile.teamId);
        const teamDoc = await teamDocRef.get();

        if (teamDoc.exists) {
            const teamData = teamDoc.data() as Team;
            
            // Check if team is locked
            const configDoc = await adminDb.collection('config').doc('event').get();
            const deadline = configDoc.data()?.registrationDeadline?.toDate();
            if (deadline && new Date() > deadline && teamData.isLocked !== false) {
                return { success: false, message: 'This team is locked and cannot be modified.' };
            }

            const memberToRemove = teamData.members.find(m => m.uid === uid);
            
            if (memberToRemove) {
                
                // 1. Remove member from team's array
                batch.update(teamDocRef, { members: FieldValue.arrayRemove(memberToRemove) });

                // 2. Create in-app notification for the leader
                const notificationRef = adminDb.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientUid: teamData.leader.uid,
                    title: "A Member has Left Your Team",
                    message: `${userProfile.name} has left your team "${teamData.name}" by deleting their account.`,
                    read: false,
                    createdAt: FieldValue.serverTimestamp(),
                    link: '/leader'
                });
            }
        }
      } else if (userProfile.role === 'leader' && userProfile.teamId) {
          return { success: false, message: 'Team leaders cannot delete their own accounts. The team must be deleted by a SPOC or an Admin.' };
      }

      // 3. Log this activity
      const logDocRef = adminDb.collection("logs").doc();
      batch.set(logDocRef, {
          id: logDocRef.id,
          title: "User Account Deleted",
          message: `User ${userProfile.name} (${userProfile.email}) was deleted.`,
          createdAt: FieldValue.serverTimestamp(),
      });

      // 4. Delete user from Firestore
      batch.delete(userDocRef);
      console.log(`Successfully scheduled deletion of user document from Firestore for UID: ${uid}`);

      await batch.commit();

      // 5. Delete user from Firebase Auth
      await adminAuth.deleteUser(uid);
      console.log(`Successfully deleted user from Firebase Authentication for UID: ${uid}`);

      return { success: true, message: 'User has been successfully deleted.' };

    } catch (error) {
      console.error(`Error deleting user with UID ${uid}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to delete user: ${errorMessage}` };
    }
  }
);
