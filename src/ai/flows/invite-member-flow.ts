
'use server';
/**
 * @fileOverview Flow to invite a new member to a team, create their auth account, and email them their credentials.
 */
import { ai } from '@/ai/genkit';
import { InviteMemberInput, InviteMemberInputSchema, InviteMemberOutput, InviteMemberOutputSchema } from '@/lib/types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';


// Helper to generate a random password
const generatePassword = (length = 10) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  console.log("Generated temporary password for new member.");
  return retVal;
};


async function sendCredentialsEmail(name: string, email: string, password: string, teamName: string) {
    console.log("Attempting to send new member credentials email...");
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

    const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: email,
        subject: `You're Invited to Join Team ${teamName} on the Vadodara Hackathon Portal!`,
        html: `
            <h1>Welcome to the Team!</h1>
            <p>Hi ${name},</p>
            <p>You have been invited to join <strong>${teamName}</strong> for the Vadodara Hackathon 6.0.</p>
            <p>Please use the following credentials to log in to the portal and complete your profile:</p>
            <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p><a href="http://localhost:9002/login">Click here to log in</a></p>
            <p><strong>Important:</strong> You will be required to change this temporary password upon your first login.</p>
            <p>We're excited to have you on board!</p>
            <br/>
            <p>Best Regards,</p>
            <p>The Vadodara Hackathon Team</p>
        `,
    };

    console.log(`Sending member invitation email to: ${email}`);
    await transporter.sendMail(mailOptions);
    console.log(`Successfully sent email to ${email}.`);
}


export async function inviteMember(input: InviteMemberInput): Promise<InviteMemberOutput> {
  console.log("Executing inviteMember function...");
  return inviteMemberFlow(input);
}


const inviteMemberFlow = ai.defineFlow(
  {
    name: 'inviteMemberFlow',
    inputSchema: InviteMemberInputSchema,
    outputSchema: InviteMemberOutputSchema,
  },
  async (input) => {
    console.log("inviteMemberFlow started with input:", input);
    try {
        const tempPassword = generatePassword();
        const adminAuth = getAdminAuth();
        
        console.log(`Creating Firebase Auth user for ${input.memberEmail}...`);
        // 1. Create Firebase Auth user
        const userRecord = await adminAuth.createUser({
            email: input.memberEmail,
            emailVerified: true,
            password: tempPassword,
            displayName: input.memberName,
            disabled: false,
        });

        const uid = userRecord.uid;
        console.log(`Successfully created Firebase Auth user with UID: ${uid}`);
       
        console.log(`Adding member to team document ${input.teamId}...`);
        // 2. Add member to the team's array in Firestore
        const teamDocRef = doc(db, "teams", input.teamId);
        await updateDoc(teamDocRef, {
            members: arrayUnion({
                uid: uid,
                name: input.memberName,
                email: input.memberEmail,
                // These are placeholders until the user logs in and completes their profile
                enrollmentNumber: '',
                contactNumber: '',
                gender: 'Other',
            })
        });
        console.log("Successfully updated team document.");

        console.log("Sending credentials email...");
        // 3. Send email with credentials
        await sendCredentialsEmail(input.memberName, input.memberEmail, tempPassword, input.teamName);

        const result: InviteMemberOutput = {
            success: true,
            message: `Invitation sent to ${input.memberName}. Their account has been created.`,
            uid: uid,
        };
        console.log("inviteMemberFlow finished successfully.", result);
        return result;

    } catch (error: any) {
        console.error("Error inviting member:", error);
        let errorMessage = error.message || "An unknown error occurred.";
        
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'This email is already registered. Please check if they are already part of another team.';
        } else if (errorMessage.toLowerCase().includes('invalid login') || (error as any).code === 'EAUTH') {
             errorMessage = 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file. You may need to use a Google App Password.';
        }
        
        const result: InviteMemberOutput = { success: false, message: `Failed to invite member: ${errorMessage}` };
        console.error("inviteMemberFlow failed.", result);
        return result;
    }
  }
);
