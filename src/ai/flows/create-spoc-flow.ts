
'use server';
/**
 * @fileOverview Flow to create a new SPOC user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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

// This function will be called from the server-side component.
// It uses a separate auth instance to create users programmatically.
// NOTE: This requires admin privileges for the service account running the backend.
// For client-side user creation, you must use the client SDK. We are creating an admin flow
// so this should be run from a trusted server environment. For the purpose of this demo, we use
// a workaround to create user on client side.
async function createAuthUser(email: string, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user.uid;
}

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
      // Step 1: Create user in Firebase Auth
      // This is a simplified example. In a real app, you'd use the Firebase Admin SDK
      // on a secure backend to create users. Since we are in a client environment,
      // we'll just log this action and create the Firestore document.
      
      // A more robust solution would use Firebase Admin SDK in a secure backend.
      // For this demo, we're creating the auth user directly.
      // This is a workaround due to not having a full backend server with Admin SDK.
      console.warn(`A temporary password for SPOC ${input.email} will be created. The admin should communicate this to the SPOC.`);
      const uid = `spoc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
       
      console.log(`Creating auth user for ${input.email} with temporary password: ${tempPassword}`);
      // In a real app, this would be `await createAuthUser(input.email, tempPassword);`
      // but due to demo limitations, we will just log it and the admin has to create it manually.
      // A toast will now show this password to the admin.

      // Step 2: Create user profile in Firestore
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

      return {
        success: true,
        message: `SPOC profile for ${input.name} created. Please create their auth account manually in Firebase console with email ${input.email}, UID ${uid}, and temporary password: ${tempPassword}`,
        uid: uid,
      };
    } catch (error) {
      console.error("Error creating SPOC:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      
      if (errorMessage.includes('auth/email-already-in-use')) {
          return { success: false, message: 'This email is already registered. Please use a different email.' };
      }

      return { success: false, message: `Failed to create SPOC: ${errorMessage}` };
    }
  }
);
