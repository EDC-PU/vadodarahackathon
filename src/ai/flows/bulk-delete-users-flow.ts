
'use server';
/**
 * @fileOverview A flow to bulk delete users and their associated teams.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Team, UserProfile } from '@/lib/types';

const BulkDeleteUsersInputSchema = z.object({
  userIds: z.array(z.string()).describe("An array of user UIDs to delete."),
});
type BulkDeleteUsersInput = z.infer<typeof BulkDeleteUsersInputSchema>;

const BulkDeleteUsersOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedUsers: z.number().optional(),
  deletedTeams: z.number().optional(),
});
type BulkDeleteUsersOutput = z.infer<typeof BulkDeleteUsersOutputSchema>;

export async function bulkDeleteUsersAndTeams(input: BulkDeleteUsersInput): Promise<BulkDeleteUsersOutput> {
  return bulkDeleteUsersAndTeamsFlow(input);
}

const bulkDeleteUsersAndTeamsFlow = ai.defineFlow(
  {
    name: 'bulkDeleteUsersAndTeamsFlow',
    inputSchema: BulkDeleteUsersInputSchema,
    outputSchema: BulkDeleteUsersOutputSchema,
  },
  async ({ userIds }) => {
    if (!userIds || userIds.length === 0) {
      return { success: false, message: "No users selected for deletion." };
    }

    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    if (!adminDb || !adminAuth) {
      return { success: false, message: "Firebase Admin SDK not initialized." };
    }

    let deletedUsersCount = 0;
    let deletedTeamsCount = 0;
    const finalUserIdsToDelete = [...userIds];
    const skippedUsers: { email: string, role: string }[] = [];

    try {
      // First pass: Check for admin/spoc accounts and remove them from the deletion list
      const userDocPromises = userIds.map(id => adminDb.collection('users').doc(id).get());
      const userDocSnapshots = await Promise.all(userDocPromises);
      
      for (const userDoc of userDocSnapshots) {
        if (userDoc.exists) {
          const userData = userDoc.data() as UserProfile;
          if (userData.role === 'admin' || userData.role === 'spoc') {
            skippedUsers.push({ email: userData.email, role: userData.role! });
            const index = finalUserIdsToDelete.indexOf(userData.uid);
            if (index > -1) {
              finalUserIdsToDelete.splice(index, 1);
            }
          }
        }
      }

      if(finalUserIdsToDelete.length === 0 && skippedUsers.length > 0) {
        const skippedMessage = skippedUsers.map(u => `${u.email} (${u.role})`).join(', ');
        return { success: true, message: `No users were deleted. Skipped ${skippedUsers.length} protected account(s): ${skippedMessage}.`, deletedUsers: 0, deletedTeams: 0 };
      }
      
      const batch = adminDb.batch();
      const teamsToDelete = new Set<string>();
      const usersInDeletedTeams = new Set<string>();

      // Second pass: identify users and teams to delete from the filtered list
      const filteredUserDocPromises = finalUserIdsToDelete.map(id => adminDb.collection('users').doc(id).get());
      const filteredUserDocSnapshots = await Promise.all(filteredUserDocPromises);

      for (const userDoc of filteredUserDocSnapshots) {
        if (userDoc.exists) {
          const userData = userDoc.data() as UserProfile;
          if (userData.role === 'leader' && userData.teamId) {
            teamsToDelete.add(userData.teamId);
          }
        }
      }

      // Third pass: process teams marked for deletion
      if (teamsToDelete.size > 0) {
        const teamDocs = await adminDb.collection('teams').where(FieldPath.documentId(), 'in', Array.from(teamsToDelete)).get();
        for (const teamDoc of teamDocs.docs) {
            const teamData = teamDoc.data() as Team;
            usersInDeletedTeams.add(teamData.leader.uid);
            teamData.members.forEach(m => usersInDeletedTeams.add(m.uid));
            batch.delete(teamDoc.ref);
            deletedTeamsCount++;
        }
      }
      
      // Fourth pass: Update or delete all affected user profiles
      const allAffectedUsers = new Set([...finalUserIdsToDelete, ...usersInDeletedTeams]);

      for (const userId of allAffectedUsers) {
         const userRef = adminDb.collection('users').doc(userId);
         if (finalUserIdsToDelete.includes(userId)) {
             batch.delete(userRef);
         } else if (usersInDeletedTeams.has(userId)) {
             batch.update(userRef, { teamId: FieldValue.delete() });
         }
      }

      await batch.commit();

      // Finally, delete the selected users from Firebase Auth
      for (const userId of finalUserIdsToDelete) {
        try {
          await adminAuth.deleteUser(userId);
          deletedUsersCount++;
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            console.warn(`Could not delete user ${userId} from Auth. Error: ${error.message}`);
          } else {
             // User was already deleted from auth, which is fine.
             deletedUsersCount++;
          }
        }
      }

      let message = `Successfully deleted ${deletedUsersCount} user(s) and ${deletedTeamsCount} team(s).`;
      if (skippedUsers.length > 0) {
        const skippedMessage = skippedUsers.map(u => `${u.email} (${u.role})`).join(', ');
        message += ` Skipped ${skippedUsers.length} protected account(s): ${skippedMessage}.`;
      }
      
      return {
        success: true,
        message,
        deletedUsers: deletedUsersCount,
        deletedTeams: deletedTeamsCount,
      };

    } catch (error: any) {
      console.error("Error during bulk delete:", error);
      // Don't expose potentially sensitive internal error codes like "5 NOT_FOUND" to the user.
      if (error.code === 5 || (error.message && error.message.includes('NOT_FOUND'))) {
         return {
            success: false,
            message: `An error occurred during bulk deletion. One or more users may have already been deleted. Please refresh and try again.`,
         };
      }
      return {
        success: false,
        message: `An error occurred during bulk deletion: ${error.message}`,
      };
    }
  }
);
