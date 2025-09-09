
'use server';
/**
 * @fileOverview A flow to generate a .docx nomination form from a template.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile, Institute } from '@/lib/types';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { format } from 'date-fns';

const GenerateNominationFormInputSchema = z.object({
  teamId: z.string(),
  generatorRole: z.enum(['admin', 'spoc']).describe("The role of the user generating the form, to determine which template to use."),
});
type GenerateNominationFormInput = z.infer<typeof GenerateNominationFormInputSchema>;

const GenerateNominationFormOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  fileContent: z.string().optional().describe("Base64 encoded content of the .docx file."),
  fileName: z.string().optional(),
});
type GenerateNominationFormOutput = z.infer<typeof GenerateNominationFormOutputSchema>;

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


export async function generateNominationForm(input: GenerateNominationFormInput): Promise<GenerateNominationFormOutput> {
  return generateNominationFormFlow(input);
}

const generateNominationFormFlow = ai.defineFlow(
  {
    name: 'generateNominationFormFlow',
    inputSchema: GenerateNominationFormInputSchema,
    outputSchema: GenerateNominationFormOutputSchema,
  },
  async ({ teamId, generatorRole }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: "Database connection failed." };
    }

    try {
      // 1. Fetch Team Data
      const teamDoc = await db.collection('teams').doc(teamId).get();
      if (!teamDoc.exists) {
        return { success: false, message: 'Team not found.' };
      }
      const team = teamDoc.data() as Team;

      // 2. Fetch Institute Data to get the form URL if needed
      let templateUrl = "https://mnaignsupdlayf72.public.blob.vercel-storage.com/nomination_university.docx"; // Default to University level

      if (generatorRole === 'spoc') {
        const instituteQuery = await db.collection('institutes').where('name', '==', team.institute).limit(1).get();
        if (instituteQuery.empty) {
            return { success: false, message: `Your institute '${team.institute}' configuration could not be found.` };
        }
        const instituteData = instituteQuery.docs[0].data() as Institute;
        if (!instituteData.nominationFormUrl) {
            return { success: false, message: `A nomination form template has not been set for your institute. Please contact an administrator.` };
        }
        templateUrl = instituteData.nominationFormUrl;
      }

      // 3. Fetch User Profiles
      const allUserIds = [team.leader.uid, ...team.members.map(m => m.uid)];
      const usersData = await getUserProfilesInChunks(db, allUserIds);

      const leaderProfile = usersData.get(team.leader.uid);
      if (!leaderProfile) {
        return { success: false, message: 'Leader profile not found.' };
      }

      // 4. Fetch Template
      console.log(`Using template URL for role ${generatorRole}: ${templateUrl}`);
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to download template from ${templateUrl}: ${response.statusText}`);
      }
      const templateBuffer = await response.arrayBuffer();

      // 5. Populate Template
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      const dataToFill: Record<string, any> = {
        team_name: team.name,
        date: format(new Date(), 'dd-MM-yyyy'),
        leader_name: leaderProfile.name || '',
        leader_gender: leaderProfile.gender || '',
        leader_email: leaderProfile.email || '',
        leader_contact: leaderProfile.contactNumber || '',
        leader_department: leaderProfile.department || '',
        leader_year: leaderProfile.yearOfStudy || '',
        mentor_name: team.mentor?.name || 'N/A',
        mentor_gender: team.mentor?.gender || 'N/A',
        mentor_email: team.mentor?.email || 'N/A',
        mentor_contact: team.mentor?.phoneNumber || 'N/A',
        mentor_department: team.mentor?.department || 'N/A',
      };

      // Add members, ensuring we have placeholders for up to 6 members
      for (let i = 0; i < 6; i++) {
        const member = team.members[i];
        const memberProfile = member ? usersData.get(member.uid) : null;
        dataToFill[`member${i + 1}_name`] = memberProfile?.name || 'N/A';
        dataToFill[`member${i + 1}_gender`] = memberProfile?.gender || 'N/A';
        dataToFill[`member${i + 1}_email`] = memberProfile?.email || 'N/A';
        dataToFill[`member${i + 1}_contact`] = memberProfile?.contactNumber || 'N/A';
        dataToFill[`member${i + 1}_department`] = memberProfile?.department || 'N/A';
        dataToFill[`member${i + 1}_year`] = memberProfile?.yearOfStudy || 'N/A';
      }

      doc.render(dataToFill);

      // 6. Generate Output
      const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });

      return {
        success: true,
        fileContent: buf.toString('base64'),
        fileName: `${team.name}_Nomination_Form.docx`,
      };

    } catch (error: any) {
      console.error("Error generating nomination form:", error);
      return { success: false, message: `Failed to generate form: ${error.message}` };
    }
  }
);
