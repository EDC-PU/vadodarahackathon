
'use server';
/**
 * @fileOverview Flow to invite a new member to a team, create their auth account, and email them their credentials.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
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
  return retVal;
};


export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;
const InviteMemberInputSchema = z.object({
  teamId: z.string().describe("The ID of the team to add the member to."),
  teamName: z.string().describe("The name of the team."),
  memberName: z.string().describe("The full name of the new member."),
  memberEmail: z.string().email().describe("The email address of the new member."),
});

export type InviteMemberOutput = z.infer<typeof InviteMemberOutputSchema>;
const InviteMemberOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});


async function sendCredentialsEmail(name: string, email: string, password: string, teamName: string) {
    // Note: You must use an "App Password" for Gmail if 2-Step Verification is enabled.
    // See: https://support.google.com/accounts/answer/185833
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

    await transporter.sendMail(mailOptions);
}


export async function inviteMember(input: InviteMemberInput): Promise<InviteMemberOutput> {
  return inviteMemberFlow(input);
}


const inviteMemberFlow = ai.defineFlow(
  {
    name: 'inviteMemberFlow',
    inputSchema: InviteMemberInputSchema,
    outputSchema: InviteMemberOutputSchema,
  },
  async (input) => {
    try {
        const tempPassword = generatePassword();
        const adminAuth = getAdminAuth();
        
        // 1. Create Firebase Auth user
        const userRecord = await adminAuth.createUser({
            email: input.memberEmail,
            emailVerified: true,
            password: tempPassword,
            displayName: input.memberName,
            disabled: false,
        });

        const uid = userRecord.uid;
       
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

        // 3. Send email with credentials
        await sendCredentialsEmail(input.memberName, input.memberEmail, tempPassword, input.teamName);

        return {
            success: true,
            message: `Invitation sent to ${input.memberName}. Their account has been created.`,
            uid: uid,
        };

    } catch (error: any) {
        console.error("Error inviting member:", error);
        let errorMessage = error.message || "An unknown error occurred.";
        
        if (error.code === 'auth/email-already-exists') {
            errorMessage = 'This email is already registered. Please check if they are already part of another team.';
        } else if ((error as any).code === 'EAUTH' || errorMessage.toLowerCase().includes('invalid login')) {
             errorMessage = 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file. You may need to use a Google App Password.';
        }
        
        return { success: false, message: `Failed to invite member: ${errorMessage}` };
    }
  }
);
