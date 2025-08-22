
'use server';
/**
 * @fileOverview A flow for SPOCs to securely fetch all teams and their member details for a specific institute.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile } from '@/lib/types';

export const GetInstituteTeamsInputSchema = z.object({
  institute: z.string().describe("The name of the institute to fetch teams for."),
});
export type GetInstituteTeamsInput = z.infer<typeof GetInstituteTeamsInputSchema>;

export const GetInstituteTeamsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  teams: z.array(z.any()).optional().describe("An array of team objects."),
  users: z.record(z.any()).optional().describe("A map of user profiles, with UID as the key."),
});
export type GetInstituteTeamsOutput = z.infer<typeof GetInstituteTeamsOutputSchema>;


export async function getInstituteTeams(input: GetInstituteTeamsInput): Promise<GetInstituteTeamsOutput> {
  console.log("Executing getInstituteTeams function...");
  return getInstituteTeamsFlow(input);
}


const getInstituteTeamsFlow = ai.defineFlow(
  {
    name: 'getInstituteTeamsFlow',
    inputSchema: GetInstituteTeamsInputSchema,
    outputSchema: GetInstituteTeamsOutputSchema,
  },
  async ({ institute }) => {
    console.log(`getInstituteTeamsFlow started for institute: ${institute}`);
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    try {
      console.log(`Querying teams for institute: ${institute}`);
      const teamsQuery = adminDb.collection('teams').where('institute', '==', institute);
      const teamsSnapshot = await teamsQuery.get();
      const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      console.log(`Found ${teamsData.length} teams.`);

      if (teamsData.length === 0) {
        return { success: true, teams: [], users: {} };
      }

      const allUserIds = new Set<string>();
      teamsData.forEach(team => {
        allUserIds.add(team.leader.uid);
        team.members.forEach(member => {
          if (member.uid) allUserIds.add(member.uid);
        });
      });
      
      const userIds = Array.from(allUserIds);
      console.log(`Found ${userIds.length} unique user IDs to fetch.`);
      
      const usersData: Record<string, UserProfile> = {};
      
      // Firestore 'in' query is limited to 30 items. We need to fetch users in chunks.
      const chunkSize = 30;
      for (let i = 0; i < userIds.length; i += chunkSize) {
          const chunk = userIds.slice(i, i + chunkSize);
          console.log(`Fetching user chunk ${i/chunkSize + 1}...`);
          const usersQuery = adminDb.collection('users').where('uid', 'in', chunk);
          const usersSnapshot = await usersQuery.get();
          usersSnapshot.forEach(doc => {
              usersData[doc.id] = { uid: doc.id, ...doc.data() } as UserProfile;
          });
      }
      console.log(`Fetched details for ${Object.keys(usersData).length} users.`);

      return {
        success: true,
        teams: teamsData,
        users: usersData,
      };
    } catch (error) {
      console.error("Error fetching institute teams:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to fetch teams: ${errorMessage}` };
    }
  }
);
