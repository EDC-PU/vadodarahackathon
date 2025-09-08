
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
      const userDocs = await Promise.all(userIds.map(id => adminDb.collection('users').doc(id).get()));
      
      for (const userDoc of userDocs) {
        if (userDoc.exists) {
          const userData = userDoc.data() as UserProfile;
          if (userData.role === 'admin' || userData.role === 'spoc') {
            skippedUsers.push({ email: userData.email, role: userData.role! });
            // Remove protected user from the list of users to be deleted
            const index = finalUserIdsToDelete.indexOf(userData.uid);
            if (index > -1) {
              finalUserIdsToDelete.splice(index, 1);
            }
          }
        }
      }

      if(finalUserIdsToDelete.length === 0) {
        const skippedMessage = skippedUsers.map(u => `${u.email} (${u.role})`).join(', ');
        return { success: true, message: `No users were deleted. Skipped ${skippedUsers.length} protected account(s): ${skippedMessage}.` };
      }
      
      const batch = adminDb.batch();
      const teamsToDelete = new Set<string>();
      const usersInDeletedTeams = new Set<string>();

      // Second pass: identify users and teams to delete from the filtered list
      for (const userId of finalUserIdsToDelete) {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const userData = userDoc.data() as UserProfile;
          // If the user is a leader, mark their team for deletion
          if (userData.role === 'leader' && userData.teamId) {
            teamsToDelete.add(userData.teamId);
          }
        }
      }

      // Third pass: process teams marked for deletion
      for (const teamId of teamsToDelete) {
        const teamRef = adminDb.collection('teams').doc(teamId);
        const teamDoc = await teamRef.get();
        if (teamDoc.exists) {
          const teamData = teamDoc.data() as Team;
          // Add all members of the team to a set so we can update their profiles
          usersInDeletedTeams.add(teamData.leader.uid);
          teamData.members.forEach(m => usersInDeletedTeams.add(m.uid));
          
          batch.delete(teamRef);
          deletedTeamsCount++;
        }
      }
      
      // Fourth pass: Update or delete all affected user profiles
      const allAffectedUsers = new Set([...finalUserIdsToDelete, ...usersInDeletedTeams]);

      for (const userId of allAffectedUsers) {
         const userRef = adminDb.collection('users').doc(userId);
         if (finalUserIdsToDelete.includes(userId)) {
             // This user was explicitly selected for deletion
             batch.delete(userRef);
         } else if (usersInDeletedTeams.has(userId)) {
             // This user was just a member of a deleted team, so only clear their teamId
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
          console.warn(`Could not delete user ${userId} from Auth, they may have already been deleted. Error: ${error.message}`);
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
      return {
        success: false,
        message: `An error occurred during bulk deletion: ${error.message}`,
      };
    }
  }
);
