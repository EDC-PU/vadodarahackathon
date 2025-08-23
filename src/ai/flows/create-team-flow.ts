
'use server';
/**
 * @fileOverview A secure flow to create a new team and assign the leader role.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { CreateTeamInput, CreateTeamInputSchema, CreateTeamOutput, CreateTeamOutputSchema, UserProfile } from '@/lib/types';


export async function createTeam(input: CreateTeamInput): Promise<CreateTeamOutput> {
  console.log("Executing createTeam function...");
  return createTeamFlow(input);
}


const createTeamFlow = ai.defineFlow(
  {
    name: 'createTeamFlow',
    inputSchema: CreateTeamInputSchema,
    outputSchema: CreateTeamOutputSchema,
  },
  async (input) => {
    console.log("createTeamFlow started with input:", input);
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    try {
        // Check for team name uniqueness
        const teamsRef = adminDb.collection('teams');
        const q = teamsRef.where("name", "==", input.teamName);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            const errorMessage = "A team with this name already exists. Please choose another name.";
            console.error(errorMessage);
            return { success: false, message: errorMessage };
        }
        
        const batch = adminDb.batch();

        // 1. Create Team document
        const teamDocRef = adminDb.collection("teams").doc();
        const teamData = {
            id: teamDocRef.id,
            name: input.teamName,
            leader: {
                uid: input.leaderUid,
                name: input.name,
                email: input.leaderEmail,
            },
            institute: input.institute,
            department: input.department,
            members: [],
        };
        batch.set(teamDocRef, teamData);

        // 2. Update User's profile to become a leader
        const userDocRef = adminDb.collection("users").doc(input.leaderUid);
        const userProfileUpdate: Partial<UserProfile> = {
            role: "leader",
            teamId: teamDocRef.id,
            name: input.name,
            gender: input.gender,
            institute: input.institute,
            department: input.department,
            enrollmentNumber: input.enrollmentNumber,
            contactNumber: input.contactNumber,
            semester: input.semester,
            yearOfStudy: input.yearOfStudy,
            passwordChanged: true,
        };
        batch.update(userDocRef, userProfileUpdate);

        await batch.commit();

        return {
            success: true,
            message: `Team "${input.teamName}" created successfully!`,
            teamId: teamDocRef.id,
        };

    } catch (error) {
      console.error(`Error creating team:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to create team: ${errorMessage}` };
    }
  }
);

    