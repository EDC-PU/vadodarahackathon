
'use server';
/**
 * @fileOverview Flow to create a new SPOC user and email them their credentials.
 */

import { ai } from '@/ai/genkit';
import { CreateSpocInput, CreateSpocInputSchema, CreateSpocOutput, CreateSpocOutputSchema } from '@/lib/types';
import nodemailer from 'nodemailer';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getEmailTemplate } from '@/lib/email-templates';

// Helper to generate a random password
const generatePassword = (length = 10) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    console.log("Generated temporary password.");
    return retVal;
};

async function sendSpocCredentialsEmail(name: string, email: string, password: string, institute: string) {
    console.log("Attempting to send SPOC credentials email...");
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        console.error("GMAIL_EMAIL or GMAIL_PASSWORD environment variables not set.");
        throw new Error("Missing GMAIL_EMAIL or GMAIL_PASSWORD environment variables. Please set them in your .env file. Note: You must use a Google App Password for GMAIL_PASSWORD.");
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });
    console.log("Nodemailer transporter created for Gmail.");

    const emailHtml = getEmailTemplate({
        title: "Your SPOC Account has been Created!",
        body: `
            <p>Hi ${name},</p>
            <p>An account has been created for you as the Single Point of Contact (SPOC) for <strong>${institute}</strong> on the Vadodara Hackathon 6.0 Portal.</p>
            <p>Please use the following credentials to log in:</p>
            <div class="credentials">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
            </div>
            <p>As a SPOC, you can view and manage the teams registered from your institute.</p>
            <p><strong>Important:</strong> You will be required to change this temporary password upon your first login.</p>
        `,
        buttonLink: "http://localhost:9002/login",
        buttonText: "Login to Your Dashboard"
    });

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <noreply@vadodarahackathon.pierc.org>`,
        to: email,
        subject: `Your SPOC Account for the Vadodara Hackathon Portal`,
        html: emailHtml,
    };

    console.log(`Sending SPOC creation email to: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`Successfully sent email to ${email}.`);
}

export async function createSpoc(input: CreateSpocInput): Promise<CreateSpocOutput> {
  console.log("Executing createSpoc function...");
  return createSpocFlow(input);
}


const createSpocFlow = ai.defineFlow(
  {
    name: 'createSpocFlow',
    inputSchema: CreateSpocInputSchema,
    outputSchema: CreateSpocOutputSchema,
  },
  async (input) => {
    console.log("createSpocFlow started with input:", input);
    
    if (!input.email.endsWith('@paruluniversity.ac.in')) {
      const errorMessage = "SPOC email must end with @paruluniversity.ac.in";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }
    
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized. Please check server-side environment variables.";
      console.error(errorMessage);
      return { success: false, message: `Failed to create SPOC: ${errorMessage}` };
    }

    try {
      // Check if a SPOC for this institute already exists
      console.log(`Checking for existing SPOC for institute: ${input.institute}`);
      const spocQuery = adminDb.collection('users')
        .where('institute', '==', input.institute)
        .where('role', '==', 'spoc')
        .where('spocStatus', '==', 'approved');
      
      const existingSpocSnapshot = await spocQuery.get();
      if (!existingSpocSnapshot.empty) {
        const existingSpoc = existingSpocSnapshot.docs[0].data();
        const errorMessage = `An approved SPOC (${existingSpoc.name}) already exists for ${input.institute}.`;
        console.error(errorMessage);
        return { success: false, message: errorMessage };
      }
      console.log(`No existing SPOC found for ${input.institute}. Proceeding...`);

      const tempPassword = generatePassword();
      
      console.log("Creating Firebase Auth user...");
      // 1. Create Firebase Auth user
      const userRecord = await adminAuth.createUser({
          email: input.email,
          emailVerified: true,
          password: tempPassword,
          displayName: input.name,
          disabled: false,
      });

      const uid = userRecord.uid;
      console.log(`Successfully created Firebase Auth user with UID: ${uid}`);
       
      console.log("Creating user profile in Firestore...");
      // 2. Create user profile in Firestore
      const userDocRef = adminDb.collection('users').doc(uid);
      await userDocRef.set({
        uid: uid,
        name: input.name,
        email: input.email,
        institute: input.institute,
        contactNumber: input.contactNumber,
        gender: input.gender,
        department: 'N/A', // Department not needed for SPOC
        role: 'spoc',
        passwordChanged: false, // User must change this password
        spocStatus: 'approved', // Admins create pre-approved SPOCs
      });
      console.log(`Successfully created Firestore profile for UID: ${uid}`);

      console.log("Sending credentials email...");
      // 3. Send email with credentials
      await sendSpocCredentialsEmail(input.name, input.email, tempPassword, input.institute);

      const result: CreateSpocOutput = {
        success: true,
        message: `SPOC profile and login for ${input.name} created. An email with credentials has been sent.`,
        uid: uid,
      };
      console.log("createSpocFlow finished successfully.", result);
      return result;
    } catch (error: any) {
      console.error("Error creating SPOC:", error);
      let errorMessage = error.message || "An unknown error occurred.";
      if (error.code === 'auth/email-already-exists') {
          errorMessage = 'A user with this email already exists in Firebase Authentication.';
      } else if (errorMessage.toLowerCase().includes('invalid login') || (error as any).code === 'EAUTH') {
          errorMessage = 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file. You may need to use a Google App Password.';
      } else if (error.code === 'auth/invalid-password') {
          errorMessage = `The generated password is invalid: ${error.message}`;
      }
      
      const result: CreateSpocOutput = { success: false, message: `Failed to create SPOC: ${errorMessage}` };
      console.error("createSpocFlow failed.", result);
      return result;
    }
  }
);
