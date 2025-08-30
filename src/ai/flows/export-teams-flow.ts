

'use server';

/**
 * @fileOverview Flow to export all team data to an Excel file using a template with merged cells.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile, ProblemStatement, ExportTeamsOutput, ExportTeamsOutputSchema, ExportTeamsInputSchema, ExportTeamsInput } from '@/lib/types';
import type { Query as AdminQuery } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs/promises';

export async function exportTeams(input: ExportTeamsInput): Promise<ExportTeamsOutput> {
    console.log("Executing exportTeams function with merged cells logic...");
    return exportTeamsFlow(input);
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


const exportTeamsFlow = ai.defineFlow(
    {
        name: 'exportTeamsFlow',
        inputSchema: ExportTeamsInputSchema,
        outputSchema: ExportTeamsOutputSchema,
    },
    async ({ institute, category, status, problemStatementIds, memberCount, role }) => {
        console.log("exportTeamsFlow (merged version) started with filters:", { institute, category, status, problemStatementIds, memberCount, role });
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
            if (problemStatementIds && problemStatementIds.length > 0) {
                teamsQuery = teamsQuery.where('problemStatementId', 'in', problemStatementIds);
            }

            const teamsSnapshot = await teamsQuery.get();
            let teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

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

            // Post-query Filters
            teamsData = teamsData.filter(team => {
                const allMemberProfiles = [usersData.get(team.leader.uid), ...team.members.map(m => usersData.get(m.uid))].filter(Boolean) as UserProfile[];
                const currentMemberCount = allMemberProfiles.length;
                const femaleCount = allMemberProfiles.filter(m => m.gender === 'F').length;
                const instituteCount = allMemberProfiles.filter(m => m.institute === team.institute).length;

                const statusMatch = status === 'All Statuses' || !status ? true : (
                    status === 'Registered' ? (currentMemberCount === 6 && femaleCount >= 1 && instituteCount >= 3) :
                    ! (currentMemberCount === 6 && femaleCount >= 1 && instituteCount >= 3)
                );
                
                const memberCountMatch = memberCount === "All" || !memberCount ? true : currentMemberCount === memberCount;
                
                return statusMatch && memberCountMatch;
            });


            if (teamsData.length === 0) {
                return { success: false, message: "No teams found for the selected filters." };
            }
            console.log(`Found ${teamsData.length} teams after filtering.`);


            console.log(`Fetched ${usersData.size} users and ${problemStatementsData.size} problem statements.`);

            // 2. Load ExcelJS Template
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

            // 3. Create a new workbook and copy the header
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Teams');
            const headerRow = sheet.addRow(templateSheet.getRow(1).values as any[]);
            headerRow.eachCell((cell, colNumber) => {
                const templateCell = templateSheet.getCell(1, colNumber);
                cell.style = templateCell.style;
            });

            // 4. Populate Workbook with Data
            console.log("Step 3: Populating workbook with data...");
            let currentRowIndex = 2; // Start writing data from the second row

            for (const team of teamsData) {
                const leaderProfile = usersData.get(team.leader.uid);
                const problemStatement = team.problemStatementId ? problemStatementsData.get(team.problemStatementId) : null;
                
                let allMembers = [
                    { ...(leaderProfile || team.leader), isLeader: true },
                     ...team.members.map(m => ({ ...(usersData.get(m.uid) || m), isLeader: false }))
                ];

                if (role === 'leader') {
                    allMembers = allMembers.filter(m => m.isLeader);
                } else if (role === 'member') {
                    allMembers = allMembers.filter(m => !m.isLeader);
                }
                
                const teamSize = allMembers.length;
                if (teamSize === 0) continue;

                const startRow = currentRowIndex;
                const endRow = startRow + teamSize - 1;

                allMembers.forEach((member) => {
                    const memberProfile = member as UserProfile; // Cast for easier access
                    sheet.addRow([
                        team.name || 'N/A', // A
                        team.teamNumber || 'N/A', // B
                        memberProfile?.name || (member as any)?.name || 'N/A', // C
                        memberProfile?.email || (member as any)?.email || 'N/A', // D
                        memberProfile?.contactNumber || (member as any)?.contactNumber || 'N/A', // E
                        memberProfile?.department || 'N/A', // F
                        team.institute || 'N/A', // G
                        memberProfile?.enrollmentNumber || (member as any)?.enrollmentNumber || 'N/A', // H
                        memberProfile?.gender || (member as any)?.gender || 'N/A', // I
                        memberProfile?.yearOfStudy || (member as any)?.yearOfStudy || 'N/A', // J
                        memberProfile?.semester || (member as any)?.semester || 'N/A', // K
                        problemStatement?.problemStatementId || 'N/A', // L
                        problemStatement?.title || 'N/A', // M
                    ]);
                });

                // Apply vertical merging for the team block
                if (teamSize > 1) {
                    sheet.mergeCells(`A${startRow}:A${endRow}`);
                    sheet.mergeCells(`B${startRow}:B${endRow}`);
                    sheet.mergeCells(`G${startRow}:G${endRow}`);
                    sheet.mergeCells(`L${startRow}:L${endRow}`);
                    sheet.mergeCells(`M${startRow}:M${endRow}`);
                }

                // Apply vertical alignment to the merged cells
                const alignAndBorder = (cellAddress: string) => {
                    const cell = sheet.getCell(cellAddress);
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                };

                alignAndBorder(`A${startRow}`);
                alignAndBorder(`B${startRow}`);
                alignAndBorder(`G${startRow}`);
                alignAndBorder(`L${startRow}`);
                alignAndBorder(`M${startRow}`);

                currentRowIndex += teamSize;
            }

            // 5. Generate and return the file
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
