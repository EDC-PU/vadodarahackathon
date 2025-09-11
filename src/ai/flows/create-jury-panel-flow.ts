
'use server';
/**
 * @fileOverview Flow to create a new jury panel, create user accounts for jury members, and email them their credentials.
 */

import { ai } from '@/ai/genkit';
import { CreateJuryPanelInput, CreateJuryPanelInputSchema, CreateJuryPanelOutput, CreateJuryPanelOutputSchema, JuryMember } from '@/lib/types';
import nodemailer from 'nodemailer';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
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

export async function createJuryPanel(input: CreateJuryPanelInput): Promise<CreateJuryPanelOutput> {
  return createJuryPanelFlow(input);
}

const createJuryPanelFlow = ai.defineFlow(
  {
    name: 'createJuryPanelFlow',
    inputSchema: CreateJuryPanelInputSchema,
    outputSchema: CreateJuryPanelOutputSchema,
  },
  async ({ panelName, juryMembers, isDraft, studentCoordinatorName, studentCoordinatorContact }) => {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      return { success: false, message: "Firebase Admin SDK not initialized." };
    }

    const panelDocRef = adminDb.collection('juryPanels').doc();
    
    if (isDraft) {
        // Save as draft without creating users or sending emails
        await panelDocRef.set({
            id: panelDocRef.id,
            name: panelName,
            studentCoordinatorName: studentCoordinatorName || "",
            studentCoordinatorContact: studentCoordinatorContact || "",
            members: juryMembers, // Save details, but no UIDs yet
            status: 'draft',
            createdAt: FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            message: `Draft panel "${panelName}" saved successfully.`,
            panelId: panelDocRef.id,
        };
    }

    // Full creation process
    const newPanelMembers: JuryMember[] = [];
    const createdUserUids: string[] = [];
    let problematicEmail = '';

    try {
        for (const member of juryMembers) {
            problematicEmail = member.email; // Keep track of the current email
            const tempPassword = generatePassword();

            const userRecord = await adminAuth.createUser({
                email: member.email,
                emailVerified: true,
                password: tempPassword,
                displayName: member.name,
                disabled: false,
            });
            
            createdUserUids.push(userRecord.uid); // Track created user

            const uid = userRecord.uid;

            const userDocRef = adminDb.collection('users').doc(uid);
            await userDocRef.set({
                uid: uid,
                name: member.name,
                email: member.email,
                institute: member.institute,
                contactNumber: member.contactNumber,
                department: member.department,
                highestQualification: member.highestQualification || "",
                experience: member.experience || "",
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

            await sendJuryCredentialsEmail(member.name, member.email, tempPassword, panelName);
        }

        await panelDocRef.set({
            id: panelDocRef.id,
            name: panelName,
            studentCoordinatorName: studentCoordinatorName || "",
            studentCoordinatorContact: studentCoordinatorContact || "",
            members: newPanelMembers,
            status: 'active',
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return {
            success: true,
            message: `Panel "${panelName}" created successfully. Credentials have been emailed to all jury members.`,
            panelId: panelDocRef.id,
        };

    } catch (error: any) {
        console.error("Error creating jury panel:", error);

        // Cleanup: If any users were created before the error, delete them.
        if (createdUserUids.length > 0) {
            console.log(`Cleaning up ${createdUserUids.length} created user(s) due to an error...`);
            for (const uid of createdUserUids) {
                try {
                    await adminAuth.deleteUser(uid);
                    await adminDb.collection('users').doc(uid).delete();
                } catch (cleanupError: any) {
                    console.error(`Failed to clean up user ${uid}:`, cleanupError.message);
                }
            }
        }
        
        let errorMessage = error.message || "An unknown error occurred.";
        if (error.code === 'auth/email-already-exists') {
            errorMessage = `A user with email "${problematicEmail}" already exists. All jury members must have new accounts.`;
        }
        return { success: false, message: `Failed to create jury panel: ${errorMessage}` };
    }
  }
);
