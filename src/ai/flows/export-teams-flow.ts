
'use server';

/**
 * @fileOverview Flow to export all team data to an Excel file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Team } from '@/lib/types';
import ExcelJS from 'exceljs';

const ExportTeamsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    fileContent: z.string().optional().describe("Base64 encoded content of the Excel file."),
    fileName: z.string().optional(),
});

export type ExportTeamsOutput = z.infer<typeof ExportTeamsOutputSchema>;

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
        const teamsCollection = collection(db, 'teams');
        const teamSnapshot = await getDocs(teamsCollection);
        const teamsData = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

        if (teamsData.length === 0) {
            return { success: false, message: "No teams to export." };
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Teams');

        // Define columns
        worksheet.columns = [
            { header: 'Team Name', key: 'name', width: 30 },
            { header: 'Institute', key: 'institute', width: 40 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Department', key: 'department', width: 30 },
            { header: 'Leader Name', key: 'leaderName', width: 25 },
            { header: 'Leader Email', key: 'leaderEmail', width: 30 },
            { header: 'Member Name', key: 'memberName', width: 25 },
            { header: 'Member Email', key: 'memberEmail', width: 30 },
            { header: 'Member Enrollment', key: 'memberEnrollment', width: 20 },
            { header: 'Member Contact', key: 'memberContact', width: 20 },
            { header: 'Member Gender', key: 'memberGender', width: 15 },
        ];
        
        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data
        teamsData.forEach(team => {
            // Add leader row
            worksheet.addRow({
                name: team.name,
                institute: team.institute,
                category: team.category,
                department: team.department,
                leaderName: `${team.leader.name} (Leader)`,
                leaderEmail: team.leader.email,
            });

            // Add member rows
            team.members.forEach(member => {
                worksheet.addRow({
                    name: team.name,
                    institute: team.institute,
                    category: team.category,
                    department: team.department,
                    memberName: member.name,
                    memberEmail: member.email,
                    memberEnrollment: member.enrollmentNumber,
                    memberContact: member.contactNumber,
                    memberGender: member.gender,
                });
            });
            
             // Add a separator row for visual clarity
            worksheet.addRow({});
        });
        
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
