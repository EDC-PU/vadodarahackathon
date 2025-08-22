
'use server';

/**
 * @fileOverview Flow to export all team data to an Excel file.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin'; // Use admin DB for full access
import { Team, UserProfile, ProblemStatement, ExportTeamsOutput, ExportTeamsOutputSchema } from '@/lib/types';
import ExcelJS from 'exceljs';


export async function exportTeams(): Promise<ExportTeamsOutput> {
    return exportTeamsFlow();
}

const exportTeamsFlow = ai.defineFlow(
  {
    name: 'exportTeamsFlow',
    outputSchema: ExportTeamsOutputSchema,
  },
  async () => {
    try {
        // 1. Fetch all necessary data using the admin SDK
        const db = getAdminDb();
        const teamsSnapshot = await db.collection('teams').get();
        const usersSnapshot = await db.collection('users').get();
        const problemStatementsSnapshot = await db.collection('problemStatements').get();

        const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const problemStatementsData = problemStatementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemStatement));
        
        if (teamsData.length === 0) {
            return { success: false, message: "No teams to export." };
        }

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
            { header: 'Problem Statement Number', key: 'problemStatementId', width: 25 },
            { header: 'ProblemStatement Title', key: 'problemStatementTitle', width: 40 },
            { header: 'Department', key: 'department', width: 30 },
        ];
        
        // Style header
        worksheet.getRow(1).font = { bold: true };

        // 3. Add data rows
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
                    problemStatementId: problemStatement?.problemStatementId,
                    problemStatementTitle: team.problemStatementTitle,
                    department: memberProfile?.department,
                });
             }
        }
        
        const buffer = await workbook.xlsx.writeBuffer();
        const fileContent = Buffer.from(buffer).toString('base64');
        const fileName = `Vadodara_Hackathon_Teams_${new Date().toISOString().split('T')[0]}.xlsx`;

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
