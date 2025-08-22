
'use server';
/**
 * @fileOverview Flow to approve or reject a SPOC registration request.
 */

import { ai } from '@/ai/genkit';
import { ManageSpocRequestInput, ManageSpocRequestInputSchema, ManageSpocRequestOutput, ManageSpocRequestOutputSchema } from '@/lib/types';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';


export async function manageSpocRequest(input: ManageSpocRequestInput): Promise<ManageSpocRequestOutput> {
  console.log("Executing manageSpocRequest function...");
  return manageSpocRequestFlow(input);
}

const manageSpocRequestFlow = ai.defineFlow(
  {
    name: 'manageSpocRequestFlow',
    inputSchema: ManageSpocRequestInputSchema,
    outputSchema: ManageSpocRequestOutputSchema,
  },
  async ({ uid, action }) => {
    console.log(`manageSpocRequestFlow started. UID: ${uid}, Action: ${action}`);
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized. Please check server-side environment variables.";
      console.error(errorMessage);
      return { success: false, message: `Failed to ${action} SPOC: ${errorMessage}` };
    }

    const userDocRef = adminDb.collection('users').doc(uid);

    try {
      if (action === 'approve') {
        console.log(`Approving SPOC request for UID: ${uid}`);
        
        console.log("Enabling user in Firebase Auth...");
        // 1. Enable the user in Firebase Auth
        await adminAuth.updateUser(uid, { disabled: false });
        console.log("Auth user enabled.");
        
        console.log("Updating spocStatus in Firestore...");
        // 2. Update their status in Firestore
        await userDocRef.update({ spocStatus: 'approved' });
        console.log("Firestore spocStatus updated to 'approved'.");

        // TODO: Optionally send an approval email to the SPOC.
        
        return { success: true, message: 'SPOC request approved and account enabled.' };

      } else if (action === 'reject') {
        console.log(`Rejecting SPOC request for UID: ${uid}`);

        console.log("Deleting user from Firestore...");
        // 1. Delete the user from Firestore
        await userDocRef.delete();
        console.log("Firestore user document deleted.");

        console.log("Deleting user from Firebase Auth...");
        // 2. Delete the user from Firebase Auth
        await adminAuth.deleteUser(uid);
        console.log("Firebase Auth user deleted.");
        
        // TODO: Optionally send a rejection email.

        return { success: true, message: 'SPOC request rejected and user deleted.' };
      }
      
      console.warn("Invalid action specified in manageSpocRequestFlow.");
      return { success: false, message: 'Invalid action specified.' };

    } catch (error) {
      console.error(`Error managing SPOC request for UID ${uid}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to ${action} SPOC: ${errorMessage}` };
    }
  }
);
