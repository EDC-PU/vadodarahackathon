
'use server';
/**
 * @fileOverview Flow to finalize a draft jury panel, creating user accounts and sending credentials.
 */

import { ai } from '@/ai/genkit';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { FinalizeJuryPanelInput, FinalizeJuryPanelInputSchema, FinalizeJuryPanelOutput, FinalizeJuryPanelOutputSchema, JuryPanel, JuryMember } from '@/lib/types';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-templates';
import { FieldValue } from 'firebase-admin/firestore';

// Helper to generate a random password
const generatePassword = (length = 12) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

async function sendJuryCredentialsEmail(name: string, email: string, password: string, panelName: string) {
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        throw new Error("Missing email server configuration. Could not send credentials.");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const emailHtml = getEmailTemplate({
        title: "You've been Invited as a Jury Member!",
        body: `
            <p>Hi ${name},</p>
            <p>You have been invited to be a jury member for the Vadodara Hackathon 6.0 as part of <strong>Panel: ${panelName}</strong>.</p>
            <p>An account has been created for you on the portal. Please use the following credentials to log in:</p>
            <div class="credentials">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
            </div>
            <p><strong>Important:</strong> You will be required to change this temporary password upon your first login.</p>
        `,
        buttonLink: "https://vadodarahackathon.pierc.org/login",
        buttonText: "Login to Your Dashboard"
    });

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: `[Invitation] You are invited as a Jury Member for Vadodara Hackathon 6.0`,
        html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
}

export async function finalizeJuryPanel(input: FinalizeJuryPanelInput): Promise<FinalizeJuryPanelOutput> {
    return finalizeJuryPanelFlow(input);
}

const finalizeJuryPanelFlow = ai.defineFlow(
  {
    name: 'finalizeJuryPanelFlow',
    inputSchema: FinalizeJuryPanelInputSchema,
    outputSchema: FinalizeJuryPanelOutputSchema,
  },
  async ({ panelId }) => {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      return { success: false, message: "Firebase Admin SDK not initialized." };
    }

    const panelDocRef = adminDb.collection('juryPanels').doc(panelId);
    
    try {
        const panelDoc = await panelDocRef.get();
        if (!panelDoc.exists) {
            return { success: false, message: "Panel not found." };
        }
        const panelData = panelDoc.data() as JuryPanel;
        if (panelData.status !== 'draft') {
            return { success: false, message: "This panel has already been finalized." };
        }

        const newPanelMembers: JuryMember[] = [];
        for (const member of panelData.members) {
            const tempPassword = generatePassword();

            const userRecord = await adminAuth.createUser({
                email: member.email,
                emailVerified: true,
                password: tempPassword,
                displayName: member.name,
                disabled: false,
            });

            const uid = userRecord.uid;
            
            const memberProfile = await adminDb.collection('users').doc(uid).get();
            const userData = memberProfile.data() as any;

            const userDocRef = adminDb.collection('users').doc(uid);
            await userDocRef.set({
                uid: uid,
                name: member.name,
                email: member.email,
                institute: userData.institute,
                contactNumber: userData.contactNumber,
                department: userData.department,
                highestQualification: userData.highestQualification,
                experience: userData.experience,
                role: 'jury',
                panelId: panelDocRef.id,
                passwordChanged: false,
                createdAt: FieldValue.serverTimestamp(),
            });
            
            newPanelMembers.push({
                uid: uid,
                name: member.name,
                email: member.email,
            });

            await sendJuryCredentialsEmail(member.name, member.email, tempPassword, panelData.name);
        }

        await panelDocRef.update({
            members: newPanelMembers,
            status: 'active',
        });
        
        return {
            success: true,
            message: `Panel "${panelData.name}" has been finalized. Credentials have been emailed to all jury members.`,
        };

    } catch (error: any) {
        console.error("Error finalizing jury panel:", error);
        let errorMessage = error.message || "An unknown error occurred.";
        if (error.code === 'auth/email-already-exists') {
            errorMessage = `A user with email ${error.email} already exists. All jury members must have new accounts.`;
        }
        return { success: false, message: `Failed to finalize panel: ${errorMessage}` };
    }
  }
);
