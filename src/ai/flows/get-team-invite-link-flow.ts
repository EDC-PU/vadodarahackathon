
'use server';
/**
 * @fileOverview Flow to get or create a permanent team invitation link.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { TeamInvite, GetTeamInviteLinkInput, GetTeamInviteLinkInputSchema, GetTeamInviteLinkOutput, GetTeamInviteLinkOutputSchema } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';


export async function getTeamInviteLink(input: GetTeamInviteLinkInput): Promise<GetTeamInviteLinkOutput> {
  console.log("Executing getTeamInviteLink function...");
  return getTeamInviteLinkFlow(input);
}


const getTeamInviteLinkFlow = ai.defineFlow(
  {
    name: 'getTeamInviteLinkFlow',
    inputSchema: GetTeamInviteLinkInputSchema,
    outputSchema: GetTeamInviteLinkOutputSchema,
  },
  async ({ teamId, teamName, baseUrl }) => {
    console.log(`getTeamInviteLinkFlow started. TeamID: ${teamId}`);
    const adminDb = getAdminDb();

    if (!adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    try {
        const invitesRef = adminDb.collection("teamInvites");
        const q = invitesRef.where("teamId", "==", teamId).limit(1);
        const snapshot = await q.get();

        let inviteId: string;

        if (!snapshot.empty) {
            // Link exists, just use it
            console.log("Found existing invite link.");
            inviteId = snapshot.docs[0].id;
        } else {
            // No link exists, create one
            console.log("No invite link found. Creating a new one.");
            const newInviteRef = adminDb.collection("teamInvites").doc();
            await newInviteRef.set({
                teamId: teamId,
                teamName: teamName,
                createdAt: FieldValue.serverTimestamp(),
            });
            inviteId = newInviteRef.id;
            console.log(`New invite link created with ID: ${inviteId}`);
        }
        
        const inviteLink = `${baseUrl}/join/${inviteId}`;
        return {
            success: true,
            inviteLink: inviteLink,
        }

    } catch (error) {
      console.error(`Error getting/creating invite link for team ${teamId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to get invite link: ${errorMessage}` };
    }
  }
);

