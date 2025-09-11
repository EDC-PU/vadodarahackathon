
'use server';
/**
 * @fileOverview Flow to update a jury panel's details, including adding, removing, and updating members.
 */

import { ai } from '@/ai/genkit';
import { UpdateJuryPanelInput, UpdateJuryPanelInputSchema, UpdateJuryPanelOutput, UpdateJuryPanelOutputSchema } from '@/lib/types';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
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

// Helper to send credentials to new jury members
async function sendJuryCredentialsEmail(name: string, email: string, password: string, panelName: string) {
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        throw new Error("Missing email server configuration. Could not send credentials.");
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_EMAIL, pass: process.env.GMAIL_PASSWORD },
    });
    const emailText = `
Hi ${name},

You have been invited to be a jury member for the Vadodara Hackathon 6.0 as part of Panel: ${panelName}.

An account has been created for you on the portal. Please use the following credentials to log in:
- Email: ${email}
- Password: ${password}

Portal Link: https://vadodarahackathon.pierc.org/login

Important: You will be required to change this temporary password upon your first login.

Regards,
Vadodara Hackathon Team
    `;
    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: `[Invitation] You are invited as a Jury Member for Vadodara Hackathon 6.0`,
        text: emailText,
    };
    await transporter.sendMail(mailOptions);
}


export async function updateJuryPanel(input: UpdateJuryPanelInput): Promise<UpdateJuryPanelOutput> {
  return updateJuryPanelFlow(input);
}

const updateJuryPanelFlow = ai.defineFlow(
  {
    name: 'updateJuryPanelFlow',
    inputSchema: UpdateJuryPanelInputSchema,
    outputSchema: UpdateJuryPanelOutputSchema,
  },
  async ({ panelId, panelName, studentCoordinatorName, studentCoordinatorContact, juryMembers, originalMemberUids }) => {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    if (!adminDb || !adminAuth) {
      return { success: false, message: "Firebase Admin SDK not initialized." };
    }

    const panelRef = adminDb.collection('juryPanels').doc(panelId);
    let problematicEmail = '';

    try {
        const batch = adminDb.batch();
        const incomingUids = new Set(juryMembers.map(m => m.uid).filter(Boolean));
        const originalUids = new Set(originalMemberUids);
        
        const membersToRemove = originalMemberUids.filter(uid => !incomingUids.has(uid));
        
        // 1. Handle member removals
        for (const uid of membersToRemove) {
            console.log(`Removing member ${uid}...`);
            const userRef = adminDb.collection('users').doc(uid);
            batch.delete(userRef);
            try {
                await adminAuth.deleteUser(uid);
            } catch (error: any) {
                console.warn(`Could not delete auth user ${uid} (may have already been deleted): ${error.message}`);
            }
        }

        const finalMembersArray: { uid: string; name: string; email: string }[] = [];

        // 2. Handle member additions and updates
        for (const member of juryMembers) {
            if (member.uid && originalUids.has(member.uid)) {
                // This is an existing member, just update their details
                console.log(`Updating member ${member.uid}...`);
                const userRef = adminDb.collection('users').doc(member.uid);
                batch.update(userRef, {
                    name: member.name,
                    institute: member.institute,
                    contactNumber: member.contactNumber,
                    department: member.department,
                });
                finalMembersArray.push({ uid: member.uid, name: member.name, email: member.email });
            } else {
                // This is a new member, create accounts and send email
                console.log(`Adding new member ${member.email}...`);
                problematicEmail = member.email;
                const tempPassword = generatePassword();

                const userRecord = await adminAuth.createUser({
                    email: member.email,
                    emailVerified: true,
                    password: tempPassword,
                    displayName: member.name,
                    disabled: false,
                });

                const userRef = adminDb.collection('users').doc(userRecord.uid);
                batch.set(userRef, {
                    uid: userRecord.uid,
                    name: member.name,
                    email: member.email,
                    institute: member.institute,
                    contactNumber: member.contactNumber,
                    department: member.department,
                    role: 'jury',
                    panelId: panelId,
                    passwordChanged: false,
                    createdAt: FieldValue.serverTimestamp(),
                });

                await sendJuryCredentialsEmail(member.name, member.email, tempPassword, panelName);
                finalMembersArray.push({ uid: userRecord.uid, name: member.name, email: member.email });
            }
        }
        
        // 3. Update the panel document itself
        batch.update(panelRef, {
            name: panelName,
            studentCoordinatorName: studentCoordinatorName || "",
            studentCoordinatorContact: studentCoordinatorContact || "",
            members: finalMembersArray,
        });

        await batch.commit();

        return {
            success: true,
            message: 'Panel details updated successfully. New members (if any) have been notified.',
        };
    } catch (error: any) {
        console.error("Error updating jury panel:", error);
        let errorMessage = error.message || "An unknown error occurred.";
        if (error.code === 'auth/email-already-exists') {
            errorMessage = `A user with email "${problematicEmail}" already exists. All new jury members must have new accounts.`;
        }
        return { success: false, message: `Failed to update panel: ${errorMessage}` };
    }
  }
);
