
'use server';
/**
 * @fileOverview Flow to create a new SPOC user and email them their credentials.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';

// Helper to generate a random password
const generatePassword = (length = 10) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

async function sendSpocCredentialsEmail(name: string, email: string, password: string, institute: string) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: email,
        subject: `Your SPOC Account for the Vadodara Hackathon Portal`,
        html: `
            <h1>Welcome, SPOC!</h1>
            <p>Hi ${name},</p>
            <p>An account has been created for you as the Single Point of Contact (SPOC) for <strong>${institute}</strong> on the Vadodara Hackathon 6.0 Portal.</p>
            <p>Please use the following credentials to log in:</p>
            <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p><a href="http://localhost:9002/login">Click here to log in</a></p>
            <p>As a SPOC, you can view and manage the teams registered from your institute.</p>
            <p><strong>Important:</strong> You will be required to change this temporary password upon your first login.</p>
            <br/>
            <p>Best Regards,</p>
            <p>The Vadodara Hackathon Team</p>
        `,
    };

    await transporter.sendMail(mailOptions);
}


export type CreateSpocInput = z.infer<typeof CreateSpocInputSchema>;
const CreateSpocInputSchema = z.object({
  name: z.string().describe('Full name of the SPOC.'),
  email: z.string().email().describe('Email address for the SPOC account.'),
  institute: z.string().describe('The institute the SPOC belongs to.'),
  contactNumber: z.string().describe('The contact number of the SPOC.'),
});

export type CreateSpocOutput = z.infer<typeof CreateSpocOutputSchema>;
const CreateSpocOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});


export async function createSpoc(input: CreateSpocInput): Promise<CreateSpocOutput> {
  return createSpocFlow(input);
}


const createSpocFlow = ai.defineFlow(
  {
    name: 'createSpocFlow',
    inputSchema: CreateSpocInputSchema,
    outputSchema: CreateSpocOutputSchema,
  },
  async (input) => {
    try {
      const tempPassword = generatePassword();
      const uid = `spoc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
       
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        uid: uid,
        name: input.name,
        email: input.email,
        institute: input.institute,
        contactNumber: input.contactNumber,
        department: 'N/A', // Department not needed for SPOC
        role: 'spoc',
        passwordChanged: false, // User must change this password
      });

      // Send email with credentials
      await sendSpocCredentialsEmail(input.name, input.email, tempPassword, input.institute);

      return {
        success: true,
        message: `SPOC profile created for ${input.name} and an email has been sent. IMPORTANT: Manually create Auth user in Firebase Console with Email: ${input.email}, UID: ${uid}, and Temp Password: ${tempPassword}`,
        uid: uid,
      };
    } catch (error) {
      console.error("Error creating SPOC:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
       if ((error as any).code === 'EAUTH' || errorMessage.toLowerCase().includes('invalid login')) {
             return { success: false, message: 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file. You may need to use a Google App Password.' };
        }
      
      return { success: false, message: `Failed to create SPOC: ${errorMessage}` };
    }
  }
);
