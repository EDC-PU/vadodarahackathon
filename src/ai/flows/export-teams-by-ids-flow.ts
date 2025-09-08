
'use server';

/**
 * @fileOverview Flow to export specific teams by their IDs to an Excel file.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile, ProblemStatement } from '@/lib/types';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import path from 'path';

const ExportTeamsByIdsInputSchema = z.object({
    teamIds: z.array(z.string()).describe("An array of team IDs to export."),
});
type ExportTeamsByIdsInput = z.infer<typeof ExportTeamsByIdsInputSchema>;

const ExportTeamsByIdsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    fileContent: z.string().optional().describe("Base64 encoded content of the Excel file."),
    fileName: z.string().optional(),
});
type ExportTeamsByIdsOutput = z.infer<typeof ExportTeamsByIdsOutputSchema>;

export async function exportTeamsByIds(input: ExportTeamsByIdsInput): Promise<ExportTeamsByIdsOutput> {
    return exportTeamsByIdsFlow(input);
}


// Helper to get all user profiles in one go, handling chunks
async function getAllUserProfiles(db: FirebaseFirestore.Firestore, userIds: string[]): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();
    if (userIds.length === 0) return userProfiles;

    const chunkSize = 30; // Firestore 'in' query limit
    for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;
        try {
            const usersQuery = db.collection('users').where('uid', 'in', chunk);
            const usersSnapshot = await usersQuery.get();
            usersSnapshot.forEach(doc => {
                userProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
            });
        } catch (error) {
            console.error(`Failed to fetch user chunk ${i / chunkSize + 1}`, error);
        }
    }
    return userProfiles;
}


const exportTeamsByIdsFlow = ai.defineFlow(
    {
        name: 'exportTeamsByIdsFlow',
        inputSchema: ExportTeamsByIdsInputSchema,
        outputSchema: ExportTeamsByIdsOutputSchema,
    },
    async ({ teamIds }) => {
        console.log("exportTeamsByIdsFlow started with team IDs:", teamIds);
        const db = getAdminDb();
        if (!db) {
            return { success: false, message: "Database connection failed." };
        }

        if (!teamIds || teamIds.length === 0) {
            return { success: false, message: "No team IDs provided for export." };
        }

        try {
            console.log("Step 1: Fetching data from Firestore...");
            const teamPromises = teamIds.map(id => db.collection('teams').doc(id).get());
            const teamDocs = await Promise.all(teamPromises);
            const teamsData = teamDocs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

            if (teamsData.length === 0) {
                return { success: false, message: "No teams found for the selected IDs." };
            }

            const problemStatementsSnapshot = await db.collection('problemStatements').get();
            const problemStatementsData = new Map(problemStatementsSnapshot.docs.map(doc => [doc.id, doc.data() as ProblemStatement]));

            const allUserIds = new Set<string>();
            teamsData.forEach(team => {
                allUserIds.add(team.leader.uid);
                team.members.forEach(member => {
                    if (member.uid) allUserIds.add(member.uid);
                });
            });
            const usersData = await getAllUserProfiles(db, Array.from(allUserIds));

            console.log(`Found ${teamsData.length} teams.`);
            console.log(`Fetched ${usersData.size} users and ${problemStatementsData.size} problem statements.`);

            console.log("Step 2: Loading Excel template...");
            const templateWorkbook = new ExcelJS.Workbook();
            try {
                const baseUrl = "https://vadodarahackathon.pierc.org";
                const templateUrl = `${baseUrl}/templates/template.xlsx`;
                console.log(`Fetching template from: ${templateUrl}`);

                const response = await fetch(templateUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                await templateWorkbook.xlsx.load(arrayBuffer);
            } catch (error: any) {
                console.error(`Error reading template file:`, error);
                return { success: false, message: `Could not load the Excel template file. Make sure 'template.xlsx' exists in the public/templates/ directory. Error: ${error.message}` };
            }
            
            const templateSheet = templateWorkbook.getWorksheet(1);
            if (!templateSheet) {
                return { success: false, message: "Could not find a worksheet in the template file." };
            }
            
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Teams');
            const headerRow = sheet.addRow(templateSheet.getRow(1).values as any[]);
            headerRow.eachCell((cell, colNumber) => {
                const templateCell = templateSheet.getCell(1, colNumber);
                cell.style = templateCell.style;
            });
            
            console.log("Step 3: Populating workbook with data...");
            let currentRowIndex = 2;

            for (const team of teamsData) {
                const leaderProfile = usersData.get(team.leader.uid);
                const problemStatement = team.problemStatementId ? problemStatementsData.get(team.problemStatementId) : null;
                
                let allMembers = [
                    { ...(leaderProfile || team.leader), isLeader: true },
                     ...team.members.map(m => ({ ...(usersData.get(m.uid) || m), isLeader: false }))
                ];
                
                const teamSize = allMembers.length;
                if (teamSize === 0) continue;

                const startRow = currentRowIndex;
                const endRow = startRow + teamSize - 1;

                allMembers.forEach((member) => {
                    const memberProfile = member as UserProfile;
                    sheet.addRow([
                        team.name || 'N/A',
                        team.teamNumber || 'N/A',
                        memberProfile?.name || (member as any)?.name || 'N/A',
                        memberProfile?.email || (member as any)?.email || 'N/A',
                        memberProfile?.contactNumber || (member as any)?.contactNumber || 'N/A',
                        memberProfile?.department || 'N/A',
                        team.institute || 'N/A',
                        memberProfile?.enrollmentNumber || (member as any)?.enrollmentNumber || 'N/A',
                        memberProfile?.gender || (member as any)?.gender || 'N/A',
                        memberProfile?.yearOfStudy || (member as any)?.yearOfStudy || 'N/A',
                        memberProfile?.semester || (member as any)?.semester || 'N/A',
                        problemStatement?.problemStatementId || 'N/A',
                        problemStatement?.title || 'N/A',
                    ]);
                });
                
                if (teamSize > 1) {
                    sheet.mergeCells(`A${startRow}:A${endRow}`);
                    sheet.mergeCells(`B${startRow}:B${endRow}`);
                    sheet.mergeCells(`G${startRow}:G${endRow}`);
                    sheet.mergeCells(`L${startRow}:L${endRow}`);
                    sheet.mergeCells(`M${startRow}:M${endRow}`);
                }

                const alignAndBorder = (cellAddress: string) => {
                    const cell = sheet.getCell(cellAddress);
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                };
                alignAndBorder(`A${startRow}`);
                alignAndBorder(`B${startRow}`);
                alignAndBorder(`G${startRow}`);
                alignAndBorder(`L${startRow}`);
                alignAndBorder(`M${startRow}`);
                currentRowIndex += teamSize;
            }
            
            console.log("Step 4: Generating final Excel file buffer...");
            const buffer = await workbook.xlsx.writeBuffer();
            const fileContent = Buffer.from(buffer).toString('base64');
            const fileName = `Nominated_Teams_${new Date().toISOString().split('T')[0]}.xlsx`;

            return {
                success: true,
                fileContent,
                fileName,
            };

        } catch (error: any) {
            console.error("Error during Excel export process:", error);
            let errorMessage = "An unknown error occurred during the export.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            return { success: false, message: `Export failed: ${errorMessage}` };
        }
    }
);
