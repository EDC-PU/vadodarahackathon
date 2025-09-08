
'use server';
/**
 * @fileOverview A secure flow for a team leader to set their team's mentor details.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { SetMentorDetailsInput, SetMentorDetailsInputSchema, SetMentorDetailsOutput, SetMentorDetailsOutputSchema, Team } from '@/lib/types';


export async function setMentorDetails(input: SetMentorDetailsInput): Promise<SetMentorDetailsOutput> {
  return setMentorDetailsFlow(input);
}

const setMentorDetailsFlow = ai.defineFlow(
  {
    name: 'setMentorDetailsFlow',
    inputSchema: SetMentorDetailsInputSchema,
    outputSchema: SetMentorDetailsOutputSchema,
  },
  async ({ teamId, leaderUid, mentor }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    try {
      const teamRef = db.collection('teams').doc(teamId);
      const teamDoc = await teamRef.get();

      if (!teamDoc.exists) {
        return { success: false, message: "Team not found." };
      }
      
      const teamData = teamDoc.data() as Team;

      if (teamData.leader.uid !== leaderUid) {
        return { success: false, message: "Only the team leader can update mentor details." };
      }
      
      // Additional check for nomination status can be added if needed
      if (!teamData.sihSelectionStatus) {
           return { success: false, message: "This team has not been nominated for SIH." };
      }

      await teamRef.update({
        mentor: mentor,
      });

      return {
        success: true,
        message: 'Mentor details have been successfully saved.',
      };
    } catch (error: any) {
      console.error('Error setting mentor details:', error);
      return {
        success: false,
        message: `Failed to save mentor details: ${error.message}`,
      };
    }
  }
);
