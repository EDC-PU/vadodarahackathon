
'use server';
/**
 * @fileOverview A flow to generate a .docx nomination form from a template.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile } from '@/lib/types';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { format } from 'date-fns';

const GenerateNominationFormInputSchema = z.object({
  teamId: z.string(),
});
type GenerateNominationFormInput = z.infer<typeof GenerateNominationFormInputSchema>;

const GenerateNominationFormOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  fileContent: z.string().optional().describe("Base64 encoded content of the .docx file."),
  fileName: z.string().optional(),
});
type GenerateNominationFormOutput = z.infer<typeof GenerateNominationFormOutputSchema>;

export async function generateNominationForm(input: GenerateNominationFormInput): Promise<GenerateNominationFormOutput> {
  return generateNominationFormFlow(input);
}

const generateNominationFormFlow = ai.defineFlow(
  {
    name: 'generateNominationFormFlow',
    inputSchema: GenerateNominationFormInputSchema,
    outputSchema: GenerateNominationFormOutputSchema,
  },
  async ({ teamId }) => {
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

      // 2. Fetch User Profiles
      const allUserIds = [team.leader.uid, ...team.members.map(m => m.uid)];
      const usersSnapshot = await db.collection('users').where('uid', 'in', allUserIds).get();
      const usersData = new Map<string, UserProfile>();
      usersSnapshot.forEach(doc => {
        usersData.set(doc.id, doc.data() as UserProfile);
      });

      const leaderProfile = usersData.get(team.leader.uid);
      if (!leaderProfile) {
        return { success: false, message: 'Leader profile not found.' };
      }

      // 3. Fetch Template
      const templateUrl = "https://mnaignsupdlayf72.public.blob.vercel-storage.com/nomination_university.docx";
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.statusText}`);
      }
      const templateBuffer = await response.arrayBuffer();

      // 4. Populate Template
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      const dataToFill = {
        team_name: team.name,
        date: format(new Date(), 'dd-MM-yyyy'),
        leader_name: leaderProfile.name || '',
        leader_gender: leaderProfile.gender || '',
        leader_email: leaderProfile.email || '',
        leader_contact: leaderProfile.contactNumber || '',
        leader_department: leaderProfile.department || '',
        leader_year: leaderProfile.yearOfStudy || '',
      };

      // Add members, ensuring we have placeholders for up to 6 members
      for (let i = 0; i < 6; i++) {
        const member = team.members[i];
        const memberProfile = member ? usersData.get(member.uid) : null;
        Object.assign(dataToFill, {
          [`member${i + 1}_name`]: memberProfile?.name || 'N/A',
          [`member${i + 1}_gender`]: memberProfile?.gender || 'N/A',
          [`member${i + 1}_email`]: memberProfile?.email || 'N/A',
          [`member${i + 1}_contact`]: memberProfile?.contactNumber || 'N/A',
          [`member${i + 1}_department`]: memberProfile?.department || 'N/A',
          [`member${i + 1}_year`]: memberProfile?.yearOfStudy || 'N/A',
        });
      }
      
      // Special cases from template
      Object.assign(dataToFill, {
        mentor1_gender: 'N/A',
        mentor_email: 'N/A',
        mentor_department: 'N/A'
      });


      doc.render(dataToFill);

      // 5. Generate Output
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
