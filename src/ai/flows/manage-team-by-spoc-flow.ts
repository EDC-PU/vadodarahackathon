
'use server';
/**
 * @fileOverview Flow for SPOCs to manage teams from their institute.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { Team, UserProfile } from '@/lib/types';
import { arrayRemove } from 'firebase/firestore';


export type ManageTeamBySpocInput = z.infer<typeof ManageTeamBySpocInputSchema>;
const ManageTeamBySpocInputSchema = z.object({
  teamId: z.string().describe("The ID of the team to manage."),
  action: z.enum(['remove-member', 'delete-team']).describe("The action to perform."),
  memberEmail: z.string().email().optional().describe("The email of the member to remove (required for 'remove-member' action)."),
});


export type ManageTeamBySpocOutput = z.infer<typeof ManageTeamBySpocOutputSchema>;
const ManageTeamBySpocOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});


export async function manageTeamBySpoc(input: ManageTeamBySpocInput): Promise<ManageTeamBySpocOutput> {
  return manageTeamBySpocFlow(input);
}


const manageTeamBySpocFlow = ai.defineFlow(
  {
    name: 'manageTeamBySpocFlow',
    inputSchema: ManageTeamBySpocInputSchema,
    outputSchema: ManageTeamBySpocOutputSchema,
  },
  async ({ teamId, action, memberEmail }) => {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    const teamDocRef = adminDb.collection('teams').doc(teamId);

    try {
        const teamDoc = await teamDocRef.get();
        if (!teamDoc.exists) {
            return { success: false, message: 'Team not found.' };
        }
        const teamData = teamDoc.data() as Team;

        if (action === 'remove-member') {
            if (!memberEmail) {
                return { success: false, message: 'Member email is required to remove a member.' };
            }
            
            const memberToRemove = teamData.members.find(m => m.email === memberEmail);
            if (!memberToRemove) {
                 return { success: false, message: 'Member not found in this team.' };
            }

            const batch = adminDb.batch();
            
            // 1. Remove member from team's array
            batch.update(teamDocRef, { members: arrayRemove(memberToRemove) });
            
            // 2. Clear teamId from the user's profile
            const userQuery = await adminDb.collection('users').where('email', '==', memberEmail).limit(1).get();
            if (!userQuery.empty) {
                const userDoc = userQuery.docs[0];
                batch.update(userDoc.ref, { teamId: '' });
            }

            await batch.commit();
            return { success: true, message: `Successfully removed ${memberToRemove.name} from the team.` };
        }

        if (action === 'delete-team') {
            const batch = adminDb.batch();

            // 1. Get all users associated with the team
            const allMemberEmails = [teamData.leader.email, ...teamData.members.map(m => m.email)];
            const usersQuery = await adminDb.collection('users').where('email', 'in', allMemberEmails).get();
            
            // 2. Clear teamId for each user
            usersQuery.forEach(userDoc => {
                batch.update(userDoc.ref, { teamId: '', role: 'member' }); // Reset role as well
            });
            
            // 3. Delete the team document
            batch.delete(teamDocRef);

            await batch.commit();
            return { success: true, message: `Team "${teamData.name}" has been deleted.` };
        }
        
        return { success: false, message: 'Invalid action specified.' };

    } catch (error) {
      console.error(`Error managing team for SPOC (Action: ${action}, TeamID: ${teamId}):`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to ${action.replace('-', ' ')}: ${errorMessage}` };
    }
  }
);
