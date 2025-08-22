'use server';

/**
 * @fileOverview A flow to grant admin privileges to a user.
 *
 * - makeAdmin - A function that finds a user by email and updates their role to 'admin'.
 * - MakeAdminInput - The input type for the makeAdmin function.
 * - MakeAdminOutput - The return type for the makeAdmin function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MakeAdminInputSchema = z.object({
  email: z.string().email().describe('The email of the user to make an admin.'),
});
export type MakeAdminInput = z.infer<typeof MakeAdminInputSchema>;

const MakeAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});
export type MakeAdminOutput = z.infer<typeof MakeAdminOutputSchema>;


export async function makeAdmin(input: MakeAdminInput): Promise<MakeAdminOutput> {
    return makeAdminFlow(input);
}


const makeAdminFlow = ai.defineFlow(
  {
    name: 'makeAdminFlow',
    inputSchema: MakeAdminInputSchema,
    outputSchema: MakeAdminOutputSchema,
  },
  async ({email}) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { success: false, message: `User with email ${email} not found.` };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userDocRef = doc(db, 'users', userDoc.id);
      
      await updateDoc(userDocRef, {
        role: 'admin'
      });

      return { success: true, message: `User ${email} has been made an admin.`, uid: userDoc.id };

    } catch (error) {
        console.error("Error making admin:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `Failed to make user admin: ${errorMessage}` };
    }
  }
);
