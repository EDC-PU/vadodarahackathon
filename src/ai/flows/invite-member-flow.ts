
'use server';
/**
 * @fileOverview Flow to invite a new member to a team by sending them an invitation email.
 */
import { ai } from '@/ai/genkit';
import { InviteMemberInput, InviteMemberInputSchema, InviteMemberOutput, InviteMemberOutputSchema } from '@/lib/types';
import { getAdminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function sendInvitationEmail(email: string, teamName: string) {
    console.log(`Attempting to send team invitation email to ${email}...`);
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
            <h1>You're Invited!</h1>
            <p>You have been invited to join <strong>${teamName}</strong> for the Vadodara Hackathon 6.0.</p>
            <p>To accept the invitation, please register or log in to the portal using this email address. You will see a notification on your dashboard.</p>
            <p><a href="http://localhost:9002/register">Click here to register or log in</a></p>
            <p>If you already have an account, simply log in to be added to the team. If not, please sign up as a "Team Member (Invited)".</p>
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
    const adminDb = getAdminDb();
     if (!adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized. Please check server-side environment variables.";
      console.error(errorMessage);
      return { success: false, message: `Failed to invite member: ${errorMessage}` };
    }

    try {
        const usersRef = collection(db, "users");
        
        // 1. Check if user already exists and is on a team
        console.log(`Checking existing user with email: ${input.memberEmail}`);
        const userQuery = query(usersRef, where("email", "==", input.memberEmail));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            const existingUser = userSnapshot.docs[0].data();
            if (existingUser.teamId) {
                const errorMessage = "This user is already part of another team.";
                console.error(errorMessage);
                return { success: false, message: errorMessage };
            }
            if (existingUser.role === 'spoc' || existingUser.role === 'admin') {
                const errorMessage = "Users with an admin or SPOC role cannot be added to teams.";
                console.error(errorMessage);
                return { success: false, message: errorMessage };
            }
        }

        // 2. Check if a pending invitation for this email already exists
        console.log(`Checking existing invitation for email: ${input.memberEmail}`);
        const invitationsRef = collection(db, "invitations");
        const invitationQuery = query(invitationsRef, where("email", "==", input.memberEmail), where("status", "==", "pending"));
        const invitationSnapshot = await getDocs(invitationQuery);
        if (!invitationSnapshot.empty) {
            const errorMessage = "An invitation has already been sent to this email address and is pending.";
            console.error(errorMessage);
            return { success: false, message: errorMessage };
        }
        
        console.log("No existing user or invitation conflicts. Creating invitation.");
        // 3. Create an invitation document
        await addDoc(invitationsRef, {
            teamId: input.teamId,
            teamName: input.teamName,
            email: input.memberEmail,
            status: 'pending', // Set initial status
            createdAt: new Date(),
        });
        console.log(`Invitation document created for ${input.memberEmail} to join ${input.teamName}`);

        // 4. Send email notification
        await sendInvitationEmail(input.memberEmail, input.teamName);

        const result: InviteMemberOutput = {
            success: true,
            message: `Invitation sent to ${input.memberEmail}. They need to log in or register to accept.`,
        };
        console.log("inviteMemberFlow finished successfully.", result);
        return result;

    } catch (error: any) {
        console.error("Error inviting member:", error);
        let errorMessage = error.message || "An unknown error occurred.";
        
        if (errorMessage.toLowerCase().includes('invalid login') || (error as any).code === 'EAUTH') {
             errorMessage = 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file. You may need to use a Google App Password.';
        }
        
        const result: InviteMemberOutput = { success: false, message: `Failed to invite member: ${errorMessage}` };
        console.error("inviteMemberFlow failed.", result);
        return result;
    }
  }
);
