
'use server';
/**
 * @fileOverview Flow to approve or reject a SPOC registration request.
 */

import { ai } from '@/ai/genkit';
import { ManageSpocRequestInput, ManageSpocRequestInputSchema, ManageSpocRequestOutput, ManageSpocRequestOutputSchema, UserProfile } from '@/lib/types';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-templates';

async function sendApprovalEmail(spoc: UserProfile) {
    const emailHtml = getEmailTemplate({
        title: "Your SPOC Application has been Approved!",
        body: `
            <p>Hi ${spoc.name},</p>
            <p>Congratulations! Your application to become the Single Point of Contact (SPOC) for <strong>${spoc.institute}</strong> has been approved by the hackathon administrators.</p>
            <p>You can now log in to your dashboard to manage your institute's teams and view important announcements.</p>
        `,
        buttonLink: "http://localhost:9002/login",
        buttonText: "Login to Dashboard"
    });

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: spoc.email,
        subject: `Your Vadodara Hackathon SPOC Application has been Approved`,
        html: emailHtml,
    };
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    await transporter.sendMail(mailOptions);
}

async function sendRejectionEmail(spoc: UserProfile) {
    const emailHtml = getEmailTemplate({
        title: "Update on Your SPOC Application",
        body: `
            <p>Hi ${spoc.name},</p>
            <p>Thank you for your interest in becoming the Single Point of Contact (SPOC) for <strong>${spoc.institute}</strong> for the Vadodara Hackathon.</p>
            <p>After careful review, we regret to inform you that your application has not been approved at this time. This may be because an approved SPOC for your institute already exists, or for other administrative reasons.</p>
            <p>If you have any questions, please feel free to contact the hackathon organizers.</p>
        `,
        buttonText: "Visit Homepage",
        buttonLink: "http://localhost:9002"
    });

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: spoc.email,
        subject: `Update on Your Vadodara Hackathon SPOC Application`,
        html: emailHtml,
    };

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });
    
    await transporter.sendMail(mailOptions);
}


export async function manageSpocRequest(input: ManageSpocRequestInput): Promise<ManageSpocRequestOutput> {
  console.log("Executing manageSpocRequest function...");
  return manageSpocRequestFlow(input);
}

const manageSpocRequestFlow = ai.defineFlow(
  {
    name: 'manageSpocRequestFlow',
    inputSchema: ManageSpocRequestInputSchema,
    outputSchema: ManageSpocRequestOutputSchema,
  },
  async ({ uid, action }) => {
    console.log(`manageSpocRequestFlow started. UID: ${uid}, Action: ${action}`);
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized. Please check server-side environment variables.";
      console.error(errorMessage);
      return { success: false, message: `Failed to ${action} SPOC: ${errorMessage}` };
    }

    const userDocRef = adminDb.collection('users').doc(uid);

    try {
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            return { success: false, message: "User not found." };
        }
        const spocProfile = userDoc.data() as UserProfile;

      if (action === 'approve') {
        console.log(`Approving SPOC request for UID: ${uid}`);
        
        console.log("Enabling user in Firebase Auth...");
        // 1. Enable the user in Firebase Auth
        await adminAuth.updateUser(uid, { disabled: false });
        console.log("Auth user enabled.");
        
        console.log("Updating spocStatus in Firestore...");
        // 2. Update their status in Firestore
        await userDocRef.update({ spocStatus: 'approved' });
        console.log("Firestore spocStatus updated to 'approved'.");

        console.log("Sending approval email...");
        // 3. Send an approval email to the SPOC.
        await sendApprovalEmail(spocProfile);
        
        return { success: true, message: 'SPOC request approved and account enabled. An email has been sent.' };

      } else if (action === 'reject') {
        console.log(`Rejecting SPOC request for UID: ${uid}`);
        
        console.log("Sending rejection email...");
        // 1. Send rejection email
        await sendRejectionEmail(spocProfile);

        console.log("Deleting user from Firestore...");
        // 2. Delete the user from Firestore
        await userDocRef.delete();
        console.log("Firestore user document deleted.");

        console.log("Deleting user from Firebase Auth...");
        // 3. Delete the user from Firebase Auth
        await adminAuth.deleteUser(uid);
        console.log("Firebase Auth user deleted.");
        

        return { success: true, message: 'SPOC request rejected and user has been notified and deleted.' };
      }
      
      console.warn("Invalid action specified in manageSpocRequestFlow.");
      return { success: false, message: 'Invalid action specified.' };

    } catch (error) {
      console.error(`Error managing SPOC request for UID ${uid}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to ${action} SPOC: ${errorMessage}` };
    }
  }
);
