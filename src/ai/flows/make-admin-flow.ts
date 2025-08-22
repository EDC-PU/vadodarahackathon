
'use server';

/**
 * @fileOverview A flow to grant admin privileges to a user.
 *
 * - makeAdmin - A function that finds a user by email and updates their role to 'admin'.
 * - MakeAdminInput - The input type for the makeAdmin function.
 * - MakeAdminOutput - The return type for the makeAdmin function.
 */

import {ai} from '@/ai/genkit';
import { MakeAdminInput, MakeAdminInputSchema, MakeAdminOutput, MakeAdminOutputSchema } from '@/lib/types';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


export async function makeAdmin(input: MakeAdminInput): Promise<MakeAdminOutput> {
    console.log("Executing makeAdmin function...");
    return makeAdminFlow(input);
}


const makeAdminFlow = ai.defineFlow(
  {
    name: 'makeAdminFlow',
    inputSchema: MakeAdminInputSchema,
    outputSchema: MakeAdminOutputSchema,
  },
  async ({email}) => {
    console.log(`makeAdminFlow started for email: ${email}`);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    
    try {
      console.log(`Querying for user with email: ${email}`);
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.warn(`User with email ${email} not found.`);
        return { success: false, message: `User with email ${email} not found.` };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userDocRef = doc(db, 'users', userDoc.id);
      
      console.log(`Found user with ID: ${userDoc.id}. Updating role to 'admin'.`);
      await updateDoc(userDocRef, {
        role: 'admin'
      });
      console.log(`Successfully updated role for user ${userDoc.id}.`);

      return { success: true, message: `User ${email} has been made an admin.`, uid: userDoc.id };

    } catch (error) {
        console.error("Error making admin:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `Failed to make user admin: ${errorMessage}` };
    }
  }
);
