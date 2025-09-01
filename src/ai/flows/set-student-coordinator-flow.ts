
'use server';
/**
 * @fileOverview A secure flow for a SPOC to set their institute's student coordinator details.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { SetStudentCoordinatorInput, SetStudentCoordinatorInputSchema, SetStudentCoordinatorOutput, SetStudentCoordinatorOutputSchema } from '@/lib/types';

export async function setStudentCoordinator(input: SetStudentCoordinatorInput): Promise<SetStudentCoordinatorOutput> {
  return setStudentCoordinatorFlow(input);
}

const setStudentCoordinatorFlow = ai.defineFlow(
  {
    name: 'setStudentCoordinatorFlow',
    inputSchema: SetStudentCoordinatorInputSchema,
    outputSchema: SetStudentCoordinatorOutputSchema,
  },
  async ({ instituteId, studentCoordinatorName, studentCoordinatorContact }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    try {
      const instituteRef = db.collection('institutes').doc(instituteId);
      
      await instituteRef.update({
        studentCoordinatorName,
        studentCoordinatorContact,
      });

      return {
        success: true,
        message: 'Student coordinator details have been successfully saved.',
      };
    } catch (error: any) {
      console.error('Error setting student coordinator:', error);
      return {
        success: false,
        message: `Failed to save details: ${error.message}`,
      };
    }
  }
);
