
'use server';
/**
 * @fileOverview A flow to generate a .docx certificate of participation.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const GenerateCertificateInputSchema = z.object({
  name: z.string().describe("The full name of the participant."),
  institute: z.string().describe("The institute of the participant."),
});
type GenerateCertificateInput = z.infer<typeof GenerateCertificateInputSchema>;

const GenerateCertificateOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  fileContent: z.string().optional().describe("Base64 encoded content of the .docx file."),
  fileName: z.string().optional(),
});
type GenerateCertificateOutput = z.infer<typeof GenerateCertificateOutputSchema>;


export async function generateCertificate(input: GenerateCertificateInput): Promise<GenerateCertificateOutput> {
  return generateCertificateFlow(input);
}

const generateCertificateFlow = ai.defineFlow(
  {
    name: 'generateCertificateFlow',
    inputSchema: GenerateCertificateInputSchema,
    outputSchema: GenerateCertificateOutputSchema,
  },
  async ({ name, institute }) => {
    try {
      const templateUrl = "https://pinxoxpbufq92wb4.public.blob.vercel-storage.com/Certificate%20of%20Participation.docx";
      
      console.log("Fetching certificate template from:", templateUrl);
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to download template: ${response.statusText}`);
      }
      const templateBuffer = await response.arrayBuffer();
      console.log("Template downloaded successfully.");

      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      
      console.log("Populating template with data:", { Name: name, institute_name: institute });
      doc.render({
        Name: name,
        institute_name: institute,
      });

      console.log("Generating output file buffer...");
      const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      const fileName = `Certificate_of_Participation_${name.replace(/\s+/g, '_')}.docx`;
      console.log("Generated file:", fileName);

      return {
        success: true,
        fileContent: buf.toString('base64'),
        fileName,
      };

    } catch (error: any) {
        console.error("Error generating certificate:", error);

        if (error.properties && error.properties.errors) {
            const detailedErrors = error.properties.errors.map((e: any) => e.properties.explanation).join(', ');
            const errorMessage = `Template Error: ${detailedErrors}`;
            console.error("Docxtemplater specific errors:", error.properties.errors);
            return { success: false, message: errorMessage };
        }

        return { success: false, message: `Failed to generate certificate: ${error.message}` };
    }
  }
);
