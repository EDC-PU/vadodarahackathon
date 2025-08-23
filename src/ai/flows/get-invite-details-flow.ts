
'use server';
/**
 * @fileOverview A secure flow to fetch details for a team invitation.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, TeamInvite, GetInviteDetailsInput, GetInviteDetailsInputSchema, GetInviteDetailsOutput, GetInviteDetailsOutputSchema } from '@/lib/types';


export async function getInviteDetails(input: GetInviteDetailsInput): Promise<GetInviteDetailsOutput> {
  console.log("Executing getInviteDetails function...");
  return getInviteDetailsFlow(input);
}

const getInviteDetailsFlow = ai.defineFlow(
  {
    name: 'getInviteDetailsFlow',
    inputSchema: GetInviteDetailsInputSchema,
    outputSchema: GetInviteDetailsOutputSchema,
  },
  async ({ inviteId }) => {
    console.log(`getInviteDetailsFlow started for inviteId: ${inviteId}`);
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    try {
      const inviteDocRef = adminDb.collection("teamInvites").doc(inviteId);
      const inviteDoc = await inviteDocRef.get();

      if (!inviteDoc.exists) {
        throw new Error("This invitation is invalid or has expired.");
      }

      const inviteData = inviteDoc.data() as TeamInvite;
      const teamDocRef = adminDb.collection("teams").doc(inviteData.teamId);
      const teamDoc = await teamDocRef.get();

      if (!teamDoc.exists) {
        throw new Error("The team you are trying to join no longer exists.");
      }
      
      const teamData = teamDoc.data() as Team;

      return {
        success: true,
        message: "Invite details fetched successfully.",
        teamName: teamData.name,
        leaderName: teamData.leader.name,
      };

    } catch (error) {
      console.error(`Error getting invite details for ID ${inviteId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to get invite details: ${errorMessage}` };
    }
  }
);
