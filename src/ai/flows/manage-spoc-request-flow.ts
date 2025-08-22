
'use server';
/**
 * @fileOverview Flow to approve or reject a SPOC registration request.
 */

import { ai } from '@/ai/genkit';
import { ManageSpocRequestInput, ManageSpocRequestInputSchema, ManageSpocRequestOutput, ManageSpocRequestOutputSchema } from '@/lib/types';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';


export async function manageSpocRequest(input: ManageSpocRequestInput): Promise<ManageSpocRequestOutput> {
  return manageSpocRequestFlow(input);
}

const manageSpocRequestFlow = ai.defineFlow(
  {
    name: 'manageSpocRequestFlow',
    inputSchema: ManageSpocRequestInputSchema,
    outputSchema: ManageSpocRequestOutputSchema,
  },
  async ({ uid, action }) => {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const userDocRef = adminDb.collection('users').doc(uid);

    try {
      if (action === 'approve') {
        // 1. Enable the user in Firebase Auth
        await adminAuth.updateUser(uid, { disabled: false });
        
        // 2. Update their status in Firestore
        await userDocRef.update({ spocStatus: 'approved' });

        // TODO: Optionally send an approval email to the SPOC.
        
        return { success: true, message: 'SPOC request approved and account enabled.' };

      } else if (action === 'reject') {
        // 1. Delete the user from Firestore
        await userDocRef.delete();

        // 2. Delete the user from Firebase Auth
        await adminAuth.deleteUser(uid);
        
        // TODO: Optionally send a rejection email.

        return { success: true, message: 'SPOC request rejected and user deleted.' };
      }
      
      return { success: false, message: 'Invalid action specified.' };

    } catch (error) {
      console.error(`Error managing SPOC request for UID ${uid}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to ${action} SPOC: ${errorMessage}` };
    }
  }
);
