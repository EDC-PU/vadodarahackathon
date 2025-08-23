'use server';

/**
 * @fileOverview Flow to export all team data to a CSV file.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin'; // Use admin DB for full access
import { Team, UserProfile, ProblemStatement, ExportTeamsOutput, ExportTeamsOutputSchema, ExportTeamsInputSchema, ExportTeamsInput } from '@/lib/types';
import type { Query as AdminQuery } from 'firebase-admin/firestore';

export async function exportTeams(input: ExportTeamsInput): Promise<ExportTeamsOutput> {
    console.log("Executing exportTeams function...");
    return exportTeamsFlow(input);
}

const exportTeamsFlow = ai.defineFlow(
  {
    name: 'exportTeamsFlow',
    inputSchema: ExportTeamsInputSchema,
    outputSchema: ExportTeamsOutputSchema,
  },
  async ({ institute, category }) => {
    console.log("exportTeamsFlow started with filters:", { institute, category });
    try {
        console.log("Fetching data from Firestore...");
        const db = getAdminDb();
        if (!db) {
            throw new Error("Firebase Admin SDK not initialized. Check server environment variables.");
        }

        let teamsQuery: AdminQuery = db.collection('teams');
        if (institute && institute !== 'All Institutes') {
            teamsQuery = teamsQuery.where('institute', '==', institute);
        }
        if (category && category !== 'All Categories') {
            teamsQuery = teamsQuery.where('category', '==', category);
        }

        let teamsSnapshot, usersSnapshot, problemStatementsSnapshot;
        try {
            teamsSnapshot = await teamsQuery.get();
            usersSnapshot = await db.collection('users').get();
            problemStatementsSnapshot = await db.collection('problemStatements').get();
            console.log(`Fetched ${teamsSnapshot.size} teams, ${usersSnapshot.size} users, and ${problemStatementsSnapshot.size} problem statements.`);
        } catch (error: any) {
            console.error("Error fetching data from Firestore:", error);
            return { success: false, message: `Failed to fetch data: ${error.message}` };
        }

        const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const problemStatementsData = problemStatementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));

        if (teamsData.length === 0) {
            console.warn("No teams found to export with the selected filters.");
            return { success: false, message: "No teams to export with the selected filters." };
        }

        console.log("Creating CSV data...");
        const csvRows = [];
        csvRows.push(['TeamName', 'TeamLeaderName', 'Name', 'Email', 'Number', 'Institute', 'EnrollmentNo', 'Gender', 'Year of Study', 'Semester', 'Problem Statement Number', 'ProblemStatement Title', 'Department'].join(','));

        for (const team of teamsData) {
            const leaderProfile = usersData.find(u => u.uid === team.leader.uid);
            const problemStatement = problemStatementsData.find(ps => ps.id === team.problemStatementId);

            // Add leader's row
            if (leaderProfile) {
                csvRows.push([
                    team.name,
                    leaderProfile.name,
                    leaderProfile.name,
                    leaderProfile.email,
                    leaderProfile.contactNumber,
                    leaderProfile.institute,
                    leaderProfile.enrollmentNumber,
                    leaderProfile.gender,
                    leaderProfile.yearOfStudy,
                    leaderProfile.semester,
                    problemStatement?.problemStatementId,
                    team.problemStatementTitle,
                    leaderProfile.department,
                ].join(','));
            }

            // Add members' rows
            for (const member of team.members) {
                const memberProfile = usersData.find(u => u.uid === member.uid || u.email === member.email);
                csvRows.push([
                    team.name,
                    leaderProfile?.name,
                    memberProfile?.name || member.name,
                    memberProfile?.email || member.email,
                    memberProfile?.contactNumber || 'N/A',
                    team.institute,
                    memberProfile?.enrollmentNumber || 'N/A',
                    memberProfile?.gender || 'N/A',
                    memberProfile?.yearOfStudy || 'N/A',
                    memberProfile?.semester || 'N/A',
                    problemStatement?.problemStatementId,
                    team.problemStatementTitle,
                    memberProfile?.department,
                ].join(','));
            }
        }

        const csvString = csvRows.join('\n');
        const fileContent = Buffer.from(csvString).toString('base64');
        const fileName = `Vadodara_Hackathon_Teams_${new Date().toISOString().split('T')[0]}.csv`;
        console.log(`File "${fileName}" generated successfully.`);

        return {
            success: true,
            fileContent,
            fileName,
        };

    } catch (error) {
        console.error("Error exporting teams:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `Export failed: ${errorMessage}` };
    }
  }
);
