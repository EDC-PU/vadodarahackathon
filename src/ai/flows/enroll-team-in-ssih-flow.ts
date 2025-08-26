
'use server';
/**
 * @fileOverview A secure flow for a SPOC to enroll a team in SSIH 2025.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';

const EnrollTeamInSsihInputSchema = z.object({
  teamId: z.string().describe("The document ID of the team to enroll."),
});
type EnrollTeamInSsihInput = z.infer<typeof EnrollTeamInSsihInputSchema>;

const EnrollTeamInSsihOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type EnrollTeamInSsihOutput = z.infer<typeof EnrollTeamInSsihOutputSchema>;

export async function enrollTeamInSsih(input: EnrollTeamInSsihInput): Promise<EnrollTeamInSsihOutput> {
  return enrollTeamInSsihFlow(input);
}

const enrollTeamInSsihFlow = ai.defineFlow(
  {
    name: 'enrollTeamInSsihFlow',
    inputSchema: EnrollTeamInSsihInputSchema,
    outputSchema: EnrollTeamInSsihOutputSchema,
  },
  async ({ teamId }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    try {
      const teamRef = db.collection('teams').doc(teamId);
      await teamRef.update({
        ssihEnrolled: true,
      });

      return {
        success: true,
        message: 'Team successfully marked as enrolled in SIH 2025.',
      };
    } catch (error: any) {
      console.error('Error enrolling team in SIH:', error);
      return {
        success: false,
        message: `Failed to enroll team: ${error.message}`,
      };
    }
  }
);
