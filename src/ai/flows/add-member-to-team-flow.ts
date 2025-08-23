
'use server';
/**
 * @fileOverview A secure flow to add a new user to a team.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { AddMemberToTeamInput, AddMemberToTeamInputSchema, AddMemberToTeamOutput, AddMemberToTeamOutputSchema, Team, UserProfile } from '@/lib/types';

export async function addMemberToTeam(input: AddMemberToTeamInput): Promise<AddMemberToTeamOutput> {
  console.log("Executing addMemberToTeam function...");
  return addMemberToTeamFlow(input);
}

const addMemberToTeamFlow = ai.defineFlow(
  {
    name: 'addMemberToTeamFlow',
    inputSchema: AddMemberToTeamInputSchema,
    outputSchema: AddMemberToTeamOutputSchema,
  },
  async ({
    userId,
    teamId,
    name,
    email,
    enrollmentNumber,
    contactNumber,
    gender,
    semester,
    yearOfStudy
  }) => {
    console.log(`addMemberToTeamFlow started for User ID: ${userId}, Team ID: ${teamId}`);
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const teamDocRef = adminDb.collection('teams').doc(teamId);

    try {
      const teamDoc = await teamDocRef.get();
      if (!teamDoc.exists) {
        throw new Error(`Team with ID ${teamId} not found.`);
      }
      const teamData = teamDoc.data() as Team;
      
      if (teamData.members.length >= 5) {
          throw new Error("This team is already full.");
      }

      const newMember = {
          uid: userId,
          name: name,
          email: email,
          enrollmentNumber: enrollmentNumber || 'N/A',
          contactNumber: contactNumber || 'N/A',
          gender: gender || 'Other',
          semester: semester,
          yearOfStudy: yearOfStudy,
      };

      const batch = adminDb.batch();
      
      // 1. Get current members and add the new member
      const currentMembers = teamData.members || [];
      currentMembers.push(newMember);
      batch.update(teamDocRef, {
        members: currentMembers
      });
      
      // 2. Update the user's profile with the teamId
      batch.update(userDocRef, {
        teamId: teamId
      });

      await batch.commit();

      return {
        success: true,
        message: `Successfully added ${name} to ${teamData.name}.`,
      };

    } catch (error) {
      console.error(`Error adding user ${userId} to team ${teamId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to add member to team: ${errorMessage}` };
    }
  }
);
