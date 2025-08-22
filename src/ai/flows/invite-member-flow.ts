
'use server';
/**
 * @fileOverview Flow to invite a new member to a team, create their auth account, and email them their credentials.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
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


export const InviteMemberInputSchema = z.object({
  teamId: z.string().describe("The ID of the team to add the member to."),
  teamName: z.string().describe("The name of the team."),
  memberName: z.string().describe("The full name of the new member."),
  memberEmail: z.string().email().describe("The email address of the new member."),
});
export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;


export const InviteMemberOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});
export type InviteMemberOutput = z.infer<typeof InviteMemberOutputSchema>;


async function createAuthUser(email: string, password: string):Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user.uid;
}


async function sendCredentialsEmail(name: string, email: string, password: string, teamName: string) {
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
        
        // This is a workaround for the demo since we can't create users on the server side
        // without the Admin SDK. In a real app, this logic would be in a secure backend function.
        console.warn(`Creating auth user for ${input.memberEmail} in the Firebase Console with this password: ${tempPassword}.`);
        const uid = `member_${Date.now()}_${Math.random().toString(36).substring(2)}`;
       
        // Add member to the team's array in Firestore
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

        // Send email with credentials
        await sendCredentialsEmail(input.memberName, input.memberEmail, tempPassword, input.teamName);

        return {
            success: true,
            message: `Invitation sent to ${input.memberName}. Their temporary password has been emailed to them. An auth account must be manually created in Firebase with UID ${uid}.`,
            uid: uid,
        };

    } catch (error) {
        console.error("Error inviting member:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        
        if (errorMessage.includes('auth/email-already-in-use')) {
            return { success: false, message: 'This email is already registered.' };
        }
        if (errorMessage.includes('Invalid login')) {
             return { success: false, message: 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file.' };
        }
        
        return { success: false, message: `Failed to invite member: ${errorMessage}` };
    }
  }
);
