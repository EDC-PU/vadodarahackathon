
'use server';

/**
 * @fileOverview Flow to export name and institute of all members of registered teams for certificates.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile, ExportCertificateDataOutput, ExportCertificateDataOutputSchema } from '@/lib/types';
import ExcelJS from 'exceljs';
import type { Query as AdminQuery } from 'firebase-admin/firestore';

export async function exportCertificateData(): Promise<ExportCertificateDataOutput> {
    console.log("Executing exportCertificateData function...");
    return exportCertificateDataFlow();
}

async function getAllUserProfiles(db: FirebaseFirestore.Firestore): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
        userProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
    });
    return userProfiles;
}

const exportCertificateDataFlow = ai.defineFlow(
    {
        name: 'exportCertificateDataFlow',
        outputSchema: ExportCertificateDataOutputSchema,
    },
    async () => {
        console.log("exportCertificateDataFlow started...");
        const db = getAdminDb();
        if (!db) {
            return { success: false, message: "Database connection failed." };
        }

        try {
            console.log("Step 1: Fetching all teams and users from Firestore...");
            const teamsSnapshot = await db.collection('teams').get();
            const allUsers = await getAllUserProfiles(db);

            const certificateData: { name: string; institute: string }[] = [];

            console.log("Step 2: Filtering for registered teams and collecting member data...");
            for (const teamDoc of teamsSnapshot.docs) {
                const team = { id: teamDoc.id, ...teamDoc.data() } as Team;

                const allMemberUIDs = [team.leader.uid, ...team.members.map(m => m.uid)];
                const teamMemberProfiles = allMemberUIDs.map(uid => allUsers.get(uid)).filter(Boolean) as UserProfile[];
                
                const hasFemale = teamMemberProfiles.some(m => m.gender === 'F');
                const instituteCount = teamMemberProfiles.filter(m => m.institute === team.institute).length;
                
                const isRegistered = teamMemberProfiles.length === 6 && hasFemale && instituteCount >= 3 && !!team.problemStatementId;
                
                if (isRegistered) {
                    teamMemberProfiles.forEach(member => {
                        certificateData.push({
                            name: member.name,
                            institute: member.institute || team.institute,
                        });
                    });
                }
            }
            
            if (certificateData.length === 0) {
                return { success: false, message: "No registered teams found to export certificate data for." };
            }

            console.log(`Found ${certificateData.length} members from registered teams.`);

            console.log("Step 3: Creating Excel workbook...");
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Certificate Data');

            sheet.columns = [
                { header: 'Name', key: 'name', width: 40 },
                { header: 'Institute', key: 'institute', width: 50 },
            ];

            sheet.getRow(1).font = { bold: true };
            sheet.addRows(certificateData);

            console.log("Step 4: Generating final Excel file buffer...");
            const buffer = await workbook.xlsx.writeBuffer();
            const fileContent = Buffer.from(buffer).toString('base64');
            const fileName = `Certificate_Data_${new Date().toISOString().split('T')[0]}.xlsx`;

            return {
                success: true,
                fileContent,
                fileName,
            };

        } catch (error: any) {
            console.error("Error during certificate data export:", error);
            return { success: false, message: `Export failed: ${error.message}` };
        }
    }
);
