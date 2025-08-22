
'use server';
/**
 * @fileOverview Flow to create a new SPOC user and email them their credentials.
 */

import { ai } from '@/ai/genkit';
import { CreateSpocInput, CreateSpocInputSchema, CreateSpocOutput, CreateSpocOutputSchema } from '@/lib/types';
import nodemailer from 'nodemailer';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

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
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        throw new Error("Missing GMAIL_EMAIL or GMAIL_PASSWORD environment variables.");
    }
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
      const adminAuth = getAdminAuth();
      const adminDb = getAdminDb();
      
      // 1. Create Firebase Auth user
      const userRecord = await adminAuth.createUser({
          email: input.email,
          emailVerified: true,
          password: tempPassword,
          displayName: input.name,
          disabled: false,
      });

      const uid = userRecord.uid;
       
      // 2. Create user profile in Firestore
      const userDocRef = adminDb.collection('users').doc(uid);
      await userDocRef.set({
        uid: uid,
        name: input.name,
        email: input.email,
        institute: input.institute,
        contactNumber: input.contactNumber,
        department: 'N/A', // Department not needed for SPOC
        role: 'spoc',
        passwordChanged: false, // User must change this password
        spocStatus: 'approved', // Admins create pre-approved SPOCs
      });

      // 3. Send email with credentials
      await sendSpocCredentialsEmail(input.name, input.email, tempPassword, input.institute);

      return {
        success: true,
        message: `SPOC profile and login for ${input.name} created. An email with credentials has been sent.`,
        uid: uid,
      };
    } catch (error: any) {
      console.error("Error creating SPOC:", error);
      let errorMessage = error.message || "An unknown error occurred.";
      if (error.code === 'auth/email-already-exists') {
          errorMessage = 'A user with this email already exists in Firebase Authentication.';
      } else if ((error as any).code === 'EAUTH' || errorMessage.toLowerCase().includes('invalid login')) {
          errorMessage = 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file. You may need to use a Google App Password.';
      } else if (error.code === 'auth/invalid-password') {
          errorMessage = `The generated password is invalid: ${error.message}`;
      }
      
      return { success: false, message: `Failed to create SPOC: ${errorMessage}` };
    }
  }
);
