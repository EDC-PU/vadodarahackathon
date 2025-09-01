
'use server';
/**
 * @fileOverview A secure flow for a SPOC to set their institute's evaluation dates.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const SetEvaluationDatesInputSchema = z.object({
  instituteId: z.string().describe("The document ID of the institute."),
  dates: z.array(z.string()).describe("An array of two ISO date strings."),
});
type SetEvaluationDatesInput = z.infer<typeof SetEvaluationDatesInputSchema>;

const SetEvaluationDatesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type SetEvaluationDatesOutput = z.infer<typeof SetEvaluationDatesOutputSchema>;


export async function setEvaluationDates(input: SetEvaluationDatesInput): Promise<SetEvaluationDatesOutput> {
  return setEvaluationDatesFlow(input);
}

const setEvaluationDatesFlow = ai.defineFlow(
  {
    name: 'setEvaluationDatesFlow',
    inputSchema: SetEvaluationDatesInputSchema,
    outputSchema: SetEvaluationDatesOutputSchema,
  },
  async ({ instituteId, dates }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    if (dates.length < 2 || dates.length > 4) {
        return { success: false, message: 'Please select between two and four dates.' };
    }

    try {
      const instituteRef = db.collection('institutes').doc(instituteId);
      
      // Convert ISO strings back to Firestore Timestamps on the server
      const firestoreTimestamps = dates.map(dateStr => Timestamp.fromDate(new Date(dateStr)));

      await instituteRef.update({
        evaluationDates: firestoreTimestamps,
      });

      return {
        success: true,
        message: 'Evaluation dates have been successfully saved.',
      };
    } catch (error: any) {
      console.error('Error setting evaluation dates:', error);
      return {
        success: false,
        message: `Failed to save dates: ${error.message}`,
      };
    }
  }
);
