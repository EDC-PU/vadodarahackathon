
'use server';
/**
 * @fileOverview A flow to bulk delete users and their associated teams.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';
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

// Helper to process arrays in chunks for Firestore queries
async function processInChunks<T, U>(items: T[], chunkSize: number, asyncOperation: (chunk: T[]) => Promise<U>): Promise<U[]> {
    const results: U[] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        if (chunk.length > 0) {
            results.push(await asyncOperation(chunk));
        }
    }
    return results;
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
    const teamsToDelete = new Set<string>();

    try {
        // First, filter out protected roles (admin, spoc) and identify teams to delete
        await processInChunks(userIds, 30, async (chunk) => {
            const userDocs = await adminDb.collection('users').where(FieldPath.documentId(), 'in', chunk).get();
            userDocs.forEach(userDoc => {
                if (userDoc.exists) {
                    const userData = userDoc.data() as UserProfile;
                    if (userData.role === 'admin' || userData.role === 'spoc') {
                        skippedUsers.push({ email: userData.email, role: userData.role! });
                        const index = finalUserIdsToDelete.indexOf(userData.uid);
                        if (index > -1) {
                            finalUserIdsToDelete.splice(index, 1);
                        }
                    } else if (userData.role === 'leader' && userData.teamId) {
                        teamsToDelete.add(userData.teamId);
                    }
                }
            });
        });
        
        if (finalUserIdsToDelete.length === 0 && skippedUsers.length > 0) {
            const skippedMessage = skippedUsers.map(u => `${u.email} (${u.role})`).join(', ');
            return { success: true, message: `No users were deleted. Skipped ${skippedUsers.length} protected account(s): ${skippedMessage}.`, deletedUsers: 0, deletedTeams: 0 };
        }

        // Process all teams marked for deletion
        if(teamsToDelete.size > 0) {
            await processInChunks(Array.from(teamsToDelete), 30, async (teamChunk) => {
                const teamDocs = await adminDb.collection('teams').where(FieldPath.documentId(), 'in', teamChunk).get();
                
                for (const teamDoc of teamDocs.docs) {
                    const teamData = teamDoc.data() as Team;
                    const memberUIDs = [...teamData.members.map(m => m.uid), teamData.leader.uid];

                    // Fetch existing user profiles to avoid updating non-existent ones
                    const usersToUpdateQuery = await adminDb.collection('users').where(FieldPath.documentId(), 'in', memberUIDs).get();
                    const batch = adminDb.batch();

                    usersToUpdateQuery.forEach(userDoc => {
                        batch.update(userDoc.ref, { teamId: FieldValue.delete() });
                    });
                    
                    batch.delete(teamDoc.ref);
                    await batch.commit();
                    deletedTeamsCount++;
                }
            });
        }
        
        // Delete user documents from Firestore in batches
        await processInChunks(finalUserIdsToDelete, 400, async (chunk) => {
            const batch = adminDb.batch();
            chunk.forEach(userId => {
                const userRef = adminDb.collection('users').doc(userId);
                batch.delete(userRef);
            });
            await batch.commit();
        });

        // Finally, delete users from Firebase Auth individually, skipping non-existent ones
        for (const userId of finalUserIdsToDelete) {
            try {
                await adminAuth.deleteUser(userId);
                deletedUsersCount++;
            } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                    console.warn(`User ${userId} not found in Auth, likely already deleted. Continuing...`);
                    deletedUsersCount++; // Count it as deleted since it's gone
                } else {
                    // Log other errors but don't stop the whole process
                    console.error(`Could not delete user ${userId} from Auth. Error: ${error.message}`);
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
      return {
        success: false,
        message: `An unexpected error occurred during bulk deletion: ${error.message}`,
      };
    }
  }
);
