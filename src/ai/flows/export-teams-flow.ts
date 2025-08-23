'use server';

/**
 * @fileOverview Flow to export all team data to an Excel file using a template.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile, ProblemStatement, ExportTeamsOutput, ExportTeamsOutputSchema, ExportTeamsInputSchema, ExportTeamsInput } from '@/lib/types';
import type { Query as AdminQuery } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';

export async function exportTeams(input: ExportTeamsInput): Promise<ExportTeamsOutput> {
    console.log("Executing exportTeams function with template logic...");
    return exportTeamsFlow(input);
}

// Helper to get all user profiles in one go, handling chunks
async function getAllUserProfiles(db: FirebaseFirestore.Firestore, userIds: string[]): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();
    const chunkSize = 30; // Firestore 'in' query limit
    for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        try {
            const usersQuery = db.collection('users').where('uid', 'in', chunk);
            const usersSnapshot = await usersQuery.get();
            usersSnapshot.forEach(doc => {
                userProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
            });
        } catch (error) {
            console.error(`Failed to fetch user chunk ${i / chunkSize + 1}`, error);
            // Decide if you want to throw or continue
        }
    }
    return userProfiles;
}


const exportTeamsFlow = ai.defineFlow(
  {
    name: 'exportTeamsFlow',
    inputSchema: ExportTeamsInputSchema,
    outputSchema: ExportTeamsOutputSchema,
  },
  async ({ institute, category }) => {
    console.log("exportTeamsFlow (template version) started with filters:", { institute, category });
    const db = getAdminDb();
    if (!db) {
        return { success: false, message: "Database connection failed." };
    }

    try {
        // 1. Fetch Data
        console.log("Step 1: Fetching data from Firestore...");
        let teamsQuery: AdminQuery = db.collection('teams');
        if (institute && institute !== 'All Institutes') {
            teamsQuery = teamsQuery.where('institute', '==', institute);
        }
        if (category && category !== 'All Categories') {
            teamsQuery = teamsQuery.where('category', '==', category);
        }

        const teamsSnapshot = await teamsQuery.get();
        const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

        if (teamsData.length === 0) {
            return { success: false, message: "No teams found for the selected filters." };
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
        console.log(`Fetched ${teamsData.length} teams, ${usersData.size} users, and ${problemStatementsData.size} problem statements.`);

        // 2. Load ExcelJS Template
        console.log("Step 2: Loading Excel template...");
        const templatePath = path.join(process.cwd(), 'public', 'template.xlsx');
        const workbook = new ExcelJS.Workbook();
        try {
            await workbook.xlsx.readFile(templatePath);
        } catch (error: any) {
             console.error(`Error reading template file at ${templatePath}:`, error);
             return { success: false, message: `Could not load the Excel template file. Make sure 'template.xlsx' exists in the 'public' directory. Error: ${error.message}` };
        }
        
        const templateSheet = workbook.getWorksheet(1); // Assuming the template is the first sheet
        if (!templateSheet) {
             return { success: false, message: "Could not find a worksheet in the template file."};
        }


        // 3. Populate Workbook with Data
        console.log("Step 3: Populating workbook with data...");
        // Remove the original template sheet, it will be used as a model.
        workbook.removeWorksheet(templateSheet.id);

        for (const team of teamsData) {
            const sheetName = team.name.replace(/[\\/*?[\]:]/g, "").substring(0, 31); // Sanitize sheet name
            const newSheet = workbook.addWorksheet(sheetName);

            // Copy styles and headers from template
            templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                const newRow = newSheet.getRow(rowNumber);
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const newCell = newRow.getCell(colNumber);
                    newCell.value = cell.value;
                    newCell.style = cell.style;
                });
            });

            const leaderProfile = usersData.get(team.leader.uid);
            const problemStatement = team.problemStatementId ? problemStatementsData.get(team.problemStatementId) : null;

            const replacements: Record<string, any> = {
                '{team_name}': team.name || '',
                '{team_id}': team.teamNumber || '',
                '{problem_statement_number}': problemStatement?.problemStatementId || '',
                '{problem_title}': problemStatement?.title || '',
                '{leader_name}': leaderProfile?.name || '',
                '{leader_email}': leaderProfile?.email || '',
                '{leader_phone}': leaderProfile?.contactNumber || '',
                '{leader_department}': leaderProfile?.department || '',
                '{leader_institute}': leaderProfile?.institute || '',
                '{leader_enrollment}': leaderProfile?.enrollmentNumber || '',
                '{leader_gender}': leaderProfile?.gender || '',
                '{leader_year}': leaderProfile?.yearOfStudy || '',
                '{leader_semester}': leaderProfile?.semester || '',
            };
            
            team.members.forEach((member, index) => {
                const memberProfile = member.uid ? usersData.get(member.uid) : null;
                const i = index + 1;
                replacements[`{member${i}_name}`] = memberProfile?.name || member.name || '';
                replacements[`{member${i}_email}`] = memberProfile?.email || member.email || '';
                replacements[`{member${i}_phone}`] = memberProfile?.contactNumber || member.contactNumber || '';
                replacements[`{member${i}_department}`] = memberProfile?.department || '';
                replacements[`{member${i}_institute}`] = team.institute || ''; // Member institute is same as team
                replacements[`{member${i}_enrollment}`] = memberProfile?.enrollmentNumber || member.enrollmentNumber || '';
                replacements[`{member${i}_gender}`] = memberProfile?.gender || member.gender || '';
                replacements[`{member${i}_year}`] = memberProfile?.yearOfStudy || member.yearOfStudy || '';
                replacements[`{member${i}_semester}`] = memberProfile?.semester || member.semester || '';
            });

            // Iterate through the new sheet to replace placeholders
            newSheet.eachRow(row => {
                row.eachCell(cell => {
                    if (typeof cell.value === 'string' && cell.value.startsWith('{') && cell.value.endsWith('}')) {
                        const placeholder = cell.value;
                        if (placeholder in replacements) {
                            cell.value = replacements[placeholder];
                        } else {
                            cell.value = ''; // Clear placeholder if no data
                        }
                    }
                });
            });
        }

        // 4. Generate and return the file
        console.log("Step 4: Generating final Excel file buffer...");
        const buffer = await workbook.xlsx.writeBuffer();
        const fileContent = Buffer.from(buffer).toString('base64');
        const fileName = `Vadodara_Hackathon_Teams_${new Date().toISOString().split('T')[0]}.xlsx`;

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
