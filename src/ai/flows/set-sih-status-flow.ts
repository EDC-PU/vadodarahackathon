
'use server';
/**
 * @fileOverview A secure flow for an admin to set the SIH selection status for a team.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';

const SetSihStatusInputSchema = z.object({
  teamId: z.string().describe("The document ID of the team."),
  status: z.enum(['university', 'institute']).describe("The SIH selection status to set."),
});
type SetSihStatusInput = z.infer<typeof SetSihStatusInputSchema>;

const SetSihStatusOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type SetSihStatusOutput = z.infer<typeof SetSihStatusOutputSchema>;

export async function setSihStatus(input: SetSihStatusInput): Promise<SetSihStatusOutput> {
  return setSihStatusFlow(input);
}

const setSihStatusFlow = ai.defineFlow(
  {
    name: 'setSihStatusFlow',
    inputSchema: SetSihStatusInputSchema,
    outputSchema: SetSihStatusOutputSchema,
  },
  async ({ teamId, status }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    try {
      const teamRef = db.collection('teams').doc(teamId);
      await teamRef.update({
        sihSelectionStatus: status,
      });

      return {
        success: true,
        message: 'Team SIH selection status updated successfully.',
      };
    } catch (error: any) {
      console.error('Error setting SIH status:', error);
      return {
        success: false,
        message: `Failed to update status: ${error.message}`,
      };
    }
  }
);
