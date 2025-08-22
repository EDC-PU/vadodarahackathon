
'use server';
/**
 * @fileOverview Flow to create a new SPOC user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Helper to generate a random password
const generatePassword = (length = 10) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};


export const CreateSpocInputSchema = z.object({
  name: z.string().describe('Full name of the SPOC.'),
  email: z.string().email().describe('Email address for the SPOC account.'),
  institute: z.string().describe('The institute the SPOC belongs to.'),
  contactNumber: z.string().describe('The contact number of the SPOC.'),
  department: z.string().describe('The department of the SPOC.'),
});
export type CreateSpocInput = z.infer<typeof CreateSpocInputSchema>;

export const CreateSpocOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});
export type CreateSpocOutput = z.infer<typeof CreateSpocOutputSchema>;

export async function createSpoc(input: CreateSpocInput): Promise<CreateSpocOutput> {
  return createSpocFlow(input);
}


const createSpocFlow = ai.defineFlow(
  {
    name: 'createSpocFlow',
    inputSchema: CreateSpocInputSchema,
    outputSchema: CreateSpocOutputSchema,
  },
  async (input) => {
    try {
      const tempPassword = generatePassword();
      // Generate a unique placeholder UID for the Firestore document.
      // This UID must be used when creating the user in the Firebase Auth console.
      const uid = `spoc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
       
      // Create the user profile in Firestore.
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        uid: uid,
        name: input.name,
        email: input.email,
        institute: input.institute,
        contactNumber: input.contactNumber,
        department: input.department,
        role: 'spoc',
      });

      // Return a success message with clear instructions for the admin.
      // This message will be shown in a toast.
      return {
        success: true,
        message: `SPOC profile created. IMPORTANT: Manually create Auth user in Firebase Console with Email: ${input.email}, UID: ${uid}, and Temp Password: ${tempPassword}`,
        uid: uid,
      };
    } catch (error) {
      console.error("Error creating SPOC:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      
      return { success: false, message: `Failed to create SPOC: ${errorMessage}` };
    }
  }
);
