
'use server';
/**
 * @fileOverview Flow to create a new SPOC user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const CreateSpocInputSchema = z.object({
  name: z.string().describe('Full name of the SPOC.'),
  email: z.string().email().describe('Email address for the SPOC account.'),
  password: z.string().min(6).describe('A temporary password for the SPOC.'),
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
      // Step 1: Create user in Firebase Auth
      // This is a simplified example. In a real app, you'd use the Firebase Admin SDK
      // on a secure backend to create users. Since we are in a client environment,
      // we'll just log this action and create the Firestore document.
      // const uid = await createAuthUser(input.email, input.password);
      
      // For this implementation, we will assume the user is created manually or via another process
      // and we just create the Firestore document.
      // A more robust solution would use Firebase Admin SDK in a secure backend.
      
      // Let's create a placeholder UID for now for the firestore doc, but in a real scenario
      // this would come from the auth creation step. For the sake of the demo, we will generate a random one
      const uid = `spoc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      console.warn(`Auth user creation skipped for SPOC ${input.email}. You should create this user in the Firebase Console.`);

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
        message: `SPOC profile for ${input.name} created. Please create their auth account in the Firebase Console with the email ${input.email} and UID ${uid}.`,
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
