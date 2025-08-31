

'use server';

/**
 * @fileOverview Flow to export user data to an Excel file with filtering.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile } from '@/lib/types';
import type { Query as AdminQuery } from 'firebase-admin/firestore';
import ExcelJS from 'exceljs';

const ExportUsersInputSchema = z.object({
    role: z.enum(['all', 'leader', 'member', 'spoc']).optional(),
    status: z.enum(['all', 'registered', 'pending']).optional(),
});
type ExportUsersInput = z.infer<typeof ExportUsersInputSchema>;

const ExportUsersOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    fileContent: z.string().optional().describe("Base64 encoded content of the Excel file."),
    fileName: z.string().optional(),
});
type ExportUsersOutput = z.infer<typeof ExportUsersOutputSchema>;

export async function exportUsers(input: ExportUsersInput): Promise<ExportUsersOutput> {
    return exportUsersFlow(input);
}

// Helper to fetch user profiles in chunks to avoid Firestore 30-item 'in' query limit
async function getUserProfilesInChunks(db: FirebaseFirestore.Firestore, userIds: string[]): Promise<Map<string, UserProfile>> {
    const userProfiles = new Map<string, UserProfile>();
    if (userIds.length === 0) return userProfiles;

    const chunkSize = 30;
    for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        if (chunk.length > 0) {
            const usersQuery = db.collection('users').where('uid', 'in', chunk);
            const usersSnapshot = await usersQuery.get();
            usersSnapshot.forEach(doc => {
                userProfiles.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
            });
        }
    }
    return userProfiles;
}


const exportUsersFlow = ai.defineFlow(
    {
        name: 'exportUsersFlow',
        inputSchema: ExportUsersInputSchema,
        outputSchema: ExportUsersOutputSchema,
    },
    async ({ role, status }) => {
        const db = getAdminDb();
        if (!db) {
            return { success: false, message: "Database connection failed." };
        }

        try {
            // 1. Fetch Data
            let usersQuery: AdminQuery = db.collection('users');
            if (role && role !== 'all') {
                usersQuery = usersQuery.where('role', '==', role);
            }
            const usersSnapshot = await usersQuery.get();
            let usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

            // Fetch all teams to check registration status
            const teamsSnapshot = await db.collection('teams').get();
            const teamsData = new Map(teamsSnapshot.docs.map(doc => [doc.id, doc.data() as Team]));
            
            const allUserIdsFromTeams = new Set<string>();
             teamsData.forEach(team => {
                allUserIdsFromTeams.add(team.leader.uid);
                team.members.forEach(member => {
                    if (member.uid) allUserIdsFromTeams.add(member.uid);
                });
            });

            // This is needed to get gender info for status calculation
            const allTeamMemberProfiles = await getUserProfilesInChunks(db, Array.from(allUserIdsFromTeams));

            // 2. Filter by Status (if needed)
            if (status && status !== 'all') {
                usersData = usersData.filter(user => {
                    const team = user.teamId ? teamsData.get(user.teamId) : undefined;
                    if (!team) return status === 'pending'; // No team = pending

                    const allMemberProfiles = [allTeamMemberProfiles.get(team.leader.uid), ...team.members.map(m => allTeamMemberProfiles.get(m.uid))].filter(Boolean) as UserProfile[];
                    const memberCount = allMemberProfiles.length;
                    const femaleCount = allMemberProfiles.filter(m => m.gender === 'F').length;
                    const instituteCount = allMemberProfiles.filter(m => m.institute === team.institute).length;

                    const isRegistered = memberCount === 6 && femaleCount >= 1 && instituteCount >= 3 && !!team.problemStatementId;
                    return status === 'registered' ? isRegistered : !isRegistered;
                });
            }

            if (usersData.length === 0) {
                return { success: false, message: "No users found for the selected filters." };
            }

            // 3. Create Excel Workbook
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Users');

            sheet.columns = [
                { header: 'Name', key: 'name', width: 30 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Role', key: 'role', width: 15 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Institute', key: 'institute', width: 40 },
                { header: 'Department', key: 'department', width: 30 },
                { header: 'Enrollment No.', key: 'enrollmentNumber', width: 20 },
                { header: 'Contact No.', key: 'contactNumber', width: 20 },
                { header: 'Gender', key: 'gender', width: 10 },
                { header: 'Year', key: 'yearOfStudy', width: 10 },
                { header: 'Semester', key: 'semester', width: 10 },
                { header: 'Team ID', key: 'teamId', width: 30 },
                { header: 'Team Name', key: 'teamName', width: 30 },
            ];

            // 4. Populate with data
            usersData.forEach(user => {
                const team = user.teamId ? teamsData.get(user.teamId) : undefined;
                let userStatus = "Pending";
                if(team) {
                    const allMemberProfiles = [allTeamMemberProfiles.get(team.leader.uid), ...team.members.map(m => allTeamMemberProfiles.get(m.uid))].filter(Boolean) as UserProfile[];
                    const memberCount = allMemberProfiles.length;
                    const femaleCount = allMemberProfiles.filter(m => m.gender === 'F').length;
                    const instituteCount = allMemberProfiles.filter(m => m.institute === team.institute).length;
                    if (memberCount === 6 && femaleCount >= 1 && instituteCount >= 3 && !!team.problemStatementId) {
                        userStatus = "Registered";
                    }
                }

                sheet.addRow({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: userStatus,
                    institute: user.institute,
                    department: user.department,
                    enrollmentNumber: user.enrollmentNumber,
                    contactNumber: user.contactNumber,
                    gender: user.gender,
                    yearOfStudy: user.yearOfStudy,
                    semester: user.semester,
                    teamId: user.teamId,
                    teamName: team?.name || 'N/A',
                });
            });

            // 5. Generate file content
            const buffer = await workbook.xlsx.writeBuffer();
            const fileContent = Buffer.from(buffer).toString('base64');
            const fileName = `Vadodara_Hackathon_Users_${new Date().toISOString().split('T')[0]}.xlsx`;

            return {
                success: true,
                fileContent,
                fileName,
            };

        } catch (error: any) {
            console.error("Error during user export:", error);
            return { success: false, message: `Export failed: ${error.message}` };
        }
    }
);
