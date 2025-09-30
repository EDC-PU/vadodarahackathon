
'use server';
/**
 * @fileOverview A flow to generate an HTML certificate of participation.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCertificateInputSchema = z.object({
  name: z.string().describe("The full name of the participant."),
  institute: z.string().describe("The institute of the participant."),
});
type GenerateCertificateInput = z.infer<typeof GenerateCertificateInputSchema>;

const GenerateCertificateOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  htmlContent: z.string().optional().describe("HTML content of the certificate."),
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
      const backgroundImageUrl = "https://pinxoxpbufq92wb4.public.blob.vercel-storage.com/Certificate%20of%20Participation.jpg";
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate of Participation</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tangerine:wght@700&family=Montserrat:wght@400;500&display=swap');
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 297mm;
              height: 210mm;
              background-image: url('${backgroundImageUrl}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: 'Montserrat', sans-serif;
              color: #333;
            }
            .name {
              position: absolute;
              top: 48%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-family: 'Tangerine', cursive;
              font-size: 80px;
              font-weight: 700;
              color: #002147;
              width: 100%;
              text-align: center;
            }
            .institute {
              position: absolute;
              top: 61%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-family: 'Montserrat', sans-serif;
              font-size: 18px;
              font-weight: 500;
              width: 80%;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="name">${name}</div>
          <div class="institute">${institute}</div>
        </body>
        </html>
      `;

      return {
        success: true,
        htmlContent,
      };

    } catch (error: any) {
        console.error("Error generating certificate HTML:", error);
        return { success: false, message: `Failed to generate certificate: ${error.message}` };
    }
  }
);
