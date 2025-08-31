
'use server';
/**
 * @fileOverview A secure flow for an Admin or SPOC to toggle the lock status of a team.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { ToggleTeamLockInput, ToggleTeamLockInputSchema, ToggleTeamLockOutput, ToggleTeamLockOutputSchema } from '@/lib/types';

export async function toggleTeamLock(input: ToggleTeamLockInput): Promise<ToggleTeamLockOutput> {
  return toggleTeamLockFlow(input);
}

const toggleTeamLockFlow = ai.defineFlow(
  {
    name: 'toggleTeamLockFlow',
    inputSchema: ToggleTeamLockInputSchema,
    outputSchema: ToggleTeamLockOutputSchema,
  },
  async ({ teamId, isLocked }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    try {
      const teamRef = db.collection('teams').doc(teamId);
      await teamRef.update({ isLocked });

      return {
        success: true,
        message: `Team has been successfully ${isLocked ? 'locked' : 'unlocked'}.`,
      };
    } catch (error: any) {
      console.error(`Error toggling lock for team ${teamId}:`, error);
      return {
        success: false,
        message: `Failed to update team lock status: ${error.message}`,
      };
    }
  }
);
