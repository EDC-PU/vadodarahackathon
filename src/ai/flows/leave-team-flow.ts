
'use server';
/**
 * @fileOverview A flow for a member to leave a team.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile, LeaveTeamInput, LeaveTeamInputSchema, LeaveTeamOutput, LeaveTeamOutputSchema } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-templates';


export async function leaveTeam(input: LeaveTeamInput): Promise<LeaveTeamOutput> {
  return leaveTeamFlow(input);
}

const leaveTeamFlow = ai.defineFlow(
  {
    name: 'leaveTeamFlow',
    inputSchema: LeaveTeamInputSchema,
    outputSchema: LeaveTeamOutputSchema,
  },
  async ({ userId }) => {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return { success: false, message: 'Database connection failed.' };
    }

    const userDocRef = adminDb.collection('users').doc(userId);

    try {
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            return { success: false, message: "User not found." };
        }
        const userProfile = userDoc.data() as UserProfile;

        if (!userProfile.teamId) {
            return { success: false, message: "You are not currently on a team." };
        }
        
        if (userProfile.role === 'leader') {
            return { success: false, message: "Team leaders cannot leave their team. The team must be deleted by a SPOC or an Admin." };
        }

        const teamDocRef = adminDb.collection('teams').doc(userProfile.teamId);
        const teamDoc = await teamDocRef.get();
        
        const batch = adminDb.batch();

        if (teamDoc.exists) {
            const teamData = teamDoc.data() as Team;
            const memberToRemove = teamData.members.find(m => m.uid === userId);
            
            if (memberToRemove) {
                // 1. Remove member from team's array
                batch.update(teamDocRef, { members: FieldValue.arrayRemove(memberToRemove) });

                // 2. Log this activity
                const logDocRef = adminDb.collection("logs").doc();
                batch.set(logDocRef, {
                    id: logDocRef.id,
                    title: "Member Left Team",
                    message: `${userProfile.name} left team "${teamData.name}".`,
                    createdAt: FieldValue.serverTimestamp(),
                });
            }
        } else {
             console.warn(`User ${userId} had a teamId for a non-existent team: ${userProfile.teamId}. Clearing their teamId anyway.`);
        }

        // 3. Clear teamId from the user's profile
        batch.update(userDocRef, { teamId: FieldValue.delete() });

        await batch.commit();

        return { success: true, message: "You have successfully left the team." };

    } catch (error) {
      console.error(`Error during leaveTeam flow for user ${userId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to leave team: ${errorMessage}` };
    }
  }
);
