
'use server';

/**
 * @fileOverview Flow to export all team data to an Excel file.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin'; // Use admin DB for full access
import { Team, UserProfile, ProblemStatement, ExportTeamsOutput, ExportTeamsOutputSchema, ExportTeamsInputSchema, ExportTeamsInput } from '@/lib/types';
import ExcelJS from 'exceljs';
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

        const teamsSnapshot = await teamsQuery.get();
        const usersSnapshot = await db.collection('users').get();
        const problemStatementsSnapshot = await db.collection('problemStatements').get();
        console.log(`Fetched ${teamsSnapshot.size} teams, ${usersSnapshot.size} users, and ${problemStatementsSnapshot.size} problem statements.`);

        const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const problemStatementsData = problemStatementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
        
        if (teamsData.length === 0) {
            console.warn("No teams found to export with the selected filters.");
            return { success: false, message: "No teams to export with the selected filters." };
        }

        console.log("Creating Excel workbook...");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Teams');

        // 2. Define columns as requested
        worksheet.columns = [
            { header: 'TeamName', key: 'teamName', width: 30 },
            { header: 'TeamLeaderName', key: 'teamLeaderName', width: 25 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Number', key: 'contactNumber', width: 20 },
            { header: 'Institute', key: 'institute', width: 40 },
            { header: 'EnrollmentNo', key: 'enrollmentNumber', width: 20 },
            { header: 'Gender', key: 'gender', width: 15 },
            { header: 'Year of Study', key: 'yearOfStudy', width: 15 },
            { header: 'Semester', key: 'semester', width: 15 },
            { header: 'Problem Statement Number', key: 'problemStatementId', width: 25 },
            { header: 'ProblemStatement Title', key: 'problemStatementTitle', width: 40 },
            { header: 'Department', key: 'department', width: 30 },
        ];
        
        // Style header
        worksheet.getRow(1).font = { bold: true };
        console.log("Excel columns defined and styled.");

        // 3. Add data rows
        console.log("Populating Excel with team data...");
        for (const team of teamsData) {
             const problemStatement = problemStatementsData.find(ps => ps.id === team.problemStatementId);
             const leaderProfile = usersData.find(u => u.uid === team.leader.uid);

             // Add leader's row
             if (leaderProfile) {
                worksheet.addRow({
                    teamName: team.name,
                    teamLeaderName: leaderProfile.name,
                    name: leaderProfile.name,
                    email: leaderProfile.email,
                    contactNumber: leaderProfile.contactNumber,
                    institute: leaderProfile.institute,
                    enrollmentNumber: leaderProfile.enrollmentNumber,
                    gender: leaderProfile.gender,
                    yearOfStudy: leaderProfile.yearOfStudy,
                    semester: leaderProfile.semester,
                    problemStatementId: problemStatement?.problemStatementId,
                    problemStatementTitle: team.problemStatementTitle,
                    department: leaderProfile.department,
                });
             }

             // Add members' rows
             for (const member of team.members) {
                const memberProfile = usersData.find(u => u.uid === member.uid || u.email === member.email);
                worksheet.addRow({
                    teamName: team.name,
                    teamLeaderName: leaderProfile?.name,
                    name: memberProfile?.name || member.name,
                    email: memberProfile?.email || member.email,
                    contactNumber: memberProfile?.contactNumber || 'N/A',
                    institute: team.institute,
                    enrollmentNumber: memberProfile?.enrollmentNumber || 'N/A',
                    gender: memberProfile?.gender || 'N/A',
                    yearOfStudy: memberProfile?.yearOfStudy || 'N/A',
                    semester: memberProfile?.semester || 'N/A',
                    problemStatementId: problemStatement?.problemStatementId,
                    problemStatementTitle: team.problemStatementTitle,
                    department: memberProfile?.department,
                });
             }
        }
        console.log("Finished populating Excel data.");
        
        console.log("Generating Excel file buffer...");
        const buffer = await workbook.xlsx.writeBuffer();
        const fileContent = Buffer.from(buffer).toString('base64');
        const fileName = `Vadodara_Hackathon_Teams_${new Date().toISOString().split('T')[0]}.xlsx`;
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
