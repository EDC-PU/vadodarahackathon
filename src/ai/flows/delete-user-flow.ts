
'use server';
/**
 * @fileOverview A flow to delete a user from Firebase Authentication and Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export const DeleteUserInputSchema = z.object({
  uid: z.string().describe('The UID of the user to be deleted.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

export const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;


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
      const errorMessage = "Firebase Admin SDK is not initialized. Please check server-side environment variables.";
      console.error(errorMessage);
      return { success: false, message: `Failed to delete user: ${errorMessage}` };
    }

    try {
      // 1. Delete user from Firestore
      const userDocRef = adminDb.collection('users').doc(uid);
      await userDocRef.delete();
      console.log(`Successfully deleted user document from Firestore for UID: ${uid}`);

      // 2. Delete user from Firebase Auth
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
