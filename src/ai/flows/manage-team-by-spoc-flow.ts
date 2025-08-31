
'use server';
/**
 * @fileOverview Flow for SPOCs to manage teams from their institute.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { Team, ManageTeamBySpocInput, ManageTeamBySpocInputSchema, ManageTeamBySpocOutput, ManageTeamBySpocOutputSchema, ProblemStatement } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';


export async function manageTeamBySpoc(input: ManageTeamBySpocInput): Promise<ManageTeamBySpocOutput> {
  console.log("Executing manageTeamBySpoc function...");
  return manageTeamBySpocFlow(input);
}


const manageTeamBySpocFlow = ai.defineFlow(
  {
    name: 'manageTeamBySpocFlow',
    inputSchema: ManageTeamBySpocInputSchema,
    outputSchema: ManageTeamBySpocOutputSchema,
  },
  async ({ teamId, action, memberEmail, problemStatementId }) => {
    console.log(`manageTeamBySpocFlow started. TeamID: ${teamId}, Action: ${action}`);
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    if (!adminAuth || !adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized. Please check server-side environment variables.";
      console.error(errorMessage);
      return { success: false, message: `Failed to ${action.replace('-', ' ')}: ${errorMessage}` };
    }
    
    const teamDocRef = adminDb.collection('teams').doc(teamId);

    try {
        console.log("Fetching team document...");
        const teamDoc = await teamDocRef.get();
        if (!teamDoc.exists) {
            console.error(`Team with ID ${teamId} not found.`);
            return { success: false, message: 'Team not found.' };
        }
        const teamData = teamDoc.data() as Team;
        console.log("Team data fetched successfully.");

        if (action === 'remove-member') {
            if (!memberEmail) {
                console.error("Action 'remove-member' called without memberEmail.");
                return { success: false, message: 'Member email is required to remove a member.' };
            }
            
            console.log(`Attempting to remove member with email: ${memberEmail}`);
            const memberToRemove = teamData.members.find(m => m.email === memberEmail);
            if (!memberToRemove) {
                 console.error(`Member with email ${memberEmail} not found in team ${teamId}.`);
                 return { success: false, message: 'Member not found in this team.' };
            }

            console.log("Starting batch write to remove member...");
            const batch = adminDb.batch();
            
            // 1. Remove member from team's array
            batch.update(teamDocRef, { members: FieldValue.arrayRemove(memberToRemove) });
            console.log("Batch update: Remove member from team array.");
            
            // 2. Clear teamId from the user's profile
            const userQuery = await adminDb.collection('users').where('email', '==', memberEmail).limit(1).get();
            if (!userQuery.empty) {
                const userDoc = userQuery.docs[0];
                batch.update(userDoc.ref, { teamId: '' });
                console.log(`Batch update: Clear teamId for user ${userDoc.id}.`);
            } else {
                console.warn(`Could not find user profile for email ${memberEmail} to clear teamId.`);
            }

            await batch.commit();
            console.log("Batch commit successful. Member removed.");
            return { success: true, message: `Successfully removed ${memberToRemove.name} from the team.` };
        }

        if (action === 'delete-team') {
            console.log(`Attempting to delete team: ${teamData.name} (${teamId})`);
            const batch = adminDb.batch();

            // 1. Get all user UIDs associated with the team
            const allMemberUIDs = [teamData.leader.uid, ...teamData.members.map(m => m.uid)];
            
            // 2. For each member, clear their teamId
            for (const uid of allMemberUIDs) {
                if(uid) {
                    const userDocRef = adminDb.collection('users').doc(uid);
                    batch.update(userDocRef, { teamId: FieldValue.delete() });
                    console.log(`Scheduled to clear teamId for user ${uid}.`);
                }
            }
            
            // 3. Delete the team document
            batch.delete(teamDocRef);
            console.log(`Scheduled deletion for team document ${teamId}.`);

            // Commit all batched writes
            await batch.commit();

            console.log("Team deleted and members' teamId cleared successfully.");
            return { success: true, message: `Team "${teamData.name}" has been deleted.` };
        }
        
        if (action === 'assign-ps') {
            if (!problemStatementId) {
                return { success: false, message: "Problem statement ID is required." };
            }
            const psDoc = await adminDb.collection('problemStatements').doc(problemStatementId).get();
            if (!psDoc.exists) {
                return { success: false, message: "Selected problem statement not found." };
            }
            const psData = psDoc.data() as ProblemStatement;
            
            await teamDocRef.update({
                problemStatementId: problemStatementId,
                problemStatementTitle: psData.title,
                category: psData.category,
            });

            return { success: true, message: `Successfully assigned "${psData.title}" to the team.` };
        }
        
        console.warn("Invalid action specified in manageTeamBySpocFlow.");
        return { success: false, message: 'Invalid action specified.' };

    } catch (error) {
      console.error(`Error managing team for SPOC (Action: ${action}, TeamID: ${teamId}):`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to ${action.replace('-', ' ')}: ${errorMessage}` };
    }
  }
);
