
'use server';
/**
 * @fileOverview A flow to generate multiple .docx nomination forms and return them as a zip file.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile, Institute } from '@/lib/types';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { format } from 'date-fns';
import JSZip from 'jszip';

const GenerateBulkNominationInputSchema = z.object({
  teamIds: z.array(z.string()),
});
type GenerateBulkNominationInput = z.infer<typeof GenerateBulkNominationInputSchema>;

const GenerateBulkNominationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  fileContent: z.string().optional().describe("Base64 encoded content of the .zip file."),
  fileName: z.string().optional(),
});
type GenerateBulkNominationOutput = z.infer<typeof GenerateBulkNominationOutputSchema>;

// This helper function encapsulates the logic for creating a single docx file.
async function createDocx(db: FirebaseFirestore.Firestore, teamId: string, templateCache: Map<string, ArrayBuffer>): Promise<{ fileName: string, buffer: Buffer } | null> {
    const teamDoc = await db.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) return null;
    const team = teamDoc.data() as Team;

    let templateBuffer = templateCache.get(team.institute);
    if (!templateBuffer) {
        const instituteQuery = await db.collection('institutes').where('name', '==', team.institute).limit(1).get();
        if (instituteQuery.empty) {
            console.warn(`Institute '${team.institute}' not found for team ${team.name}. Skipping form generation.`);
            return null;
        }
        const instituteData = instituteQuery.docs[0].data() as Institute;
        const templateUrl = instituteData.nominationFormUrl || "https://mnaignsupdlayf72.public.blob.vercel-storage.com/nomination_university.docx"; // Fallback URL
        
        console.log(`Fetching template for ${team.institute}: ${templateUrl}`);
        const response = await fetch(templateUrl);
        if (!response.ok) {
            console.error(`Failed to download template for ${team.institute} from ${templateUrl}`);
            return null;
        }
        templateBuffer = await response.arrayBuffer();
        templateCache.set(team.institute, templateBuffer);
    }

    const allUserIds = [team.leader.uid, ...team.members.map(m => m.uid)];
    const usersSnapshot = await db.collection('users').where('uid', 'in', allUserIds).get();
    const usersData = new Map<string, UserProfile>();
    usersSnapshot.forEach(doc => {
      usersData.set(doc.id, doc.data() as UserProfile);
    });

    const leaderProfile = usersData.get(team.leader.uid);
    if (!leaderProfile) return null;

    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const dataToFill: Record<string, any> = {
      team_name: team.name,
      date: format(new Date(), 'dd-MM-yyyy'),
      leader_name: leaderProfile.name || '',
      leader_gender: leaderProfile.gender || '',
      leader_email: leaderProfile.email || '',
      leader_contact: leaderProfile.contactNumber || '',
      leader_department: leaderProfile.department || '',
      leader_year: leaderProfile.yearOfStudy || '',
    };

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

    Object.assign(dataToFill, {
      mentor1_gender: 'N/A',
      mentor_email: 'N/A',
      mentor_department: 'N/A'
    });

    doc.render(dataToFill);

    const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    return { fileName: `${team.name}_Nomination_Form.docx`, buffer };
}


export async function generateBulkNomination(input: GenerateBulkNominationInput): Promise<GenerateBulkNominationOutput> {
  return generateBulkNominationFlow(input);
}

const generateBulkNominationFlow = ai.defineFlow(
  {
    name: 'generateBulkNominationFlow',
    inputSchema: GenerateBulkNominationInputSchema,
    outputSchema: GenerateBulkNominationOutputSchema,
  },
  async ({ teamIds }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: "Database connection failed." };
    }
    if (!teamIds || teamIds.length === 0) {
      return { success: false, message: "No teams were selected." };
    }

    try {
      const templateCache = new Map<string, ArrayBuffer>();
      const zip = new JSZip();

      // 2. Generate all DOCX files in parallel
      const docxPromises = teamIds.map(teamId => createDocx(db, teamId, templateCache));
      const results = await Promise.all(docxPromises);
      
      let generatedCount = 0;
      for (const result of results) {
        if (result) {
          zip.file(result.fileName, result.buffer);
          generatedCount++;
        }
      }
      
      if (generatedCount === 0) {
          return { success: false, message: "Could not generate any nomination forms for the selected teams." };
      }

      // 3. Generate ZIP file content
      const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

      return {
        success: true,
        fileContent: zipContent.toString('base64'),
        fileName: `Nomination_Forms_${format(new Date(), 'yyyy-MM-dd')}.zip`,
        message: `Successfully generated ${generatedCount} nomination forms.`
      };

    } catch (error: any) {
      console.error("Error generating bulk nomination forms:", error);
      return { success: false, message: `Failed to generate forms: ${error.message}` };
    }
  }
);
