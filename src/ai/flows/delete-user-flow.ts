
'use server';
/**
 * @fileOverview A flow to delete a user from Firebase Authentication and Firestore, and handle team cleanup.
 */

import { ai } from '@/ai/genkit';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { DeleteUserInput, DeleteUserInputSchema, DeleteUserOutput, DeleteUserOutputSchema, Team, UserProfile } from '@/lib/types';
import nodemailer from 'nodemailer';
import { sendMemberLeftEmail } from '@/lib/email-templates';
import { FieldValue } from 'firebase-admin/firestore';

async function sendNotificationEmailToLeader(leaderEmail: string, teamName: string, deletedUserName: string) {
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        console.error("GMAIL_EMAIL or GMAIL_PASSWORD environment variables not set.");
        throw new Error("Missing GMAIL_EMAIL or GMAIL_PASSWORD environment variables. Please set them in your .env file.");
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const emailHtml = sendMemberLeftEmail(leaderEmail, deletedUserName, teamName);

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: leaderEmail,
        subject: `Member Update for your team: ${teamName}`,
        html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
}


export async function deleteUser(input: DeleteUserInput): Promise<DeleteUserOutput> {
  console.log("Executing deleteUser function...");
  return deleteUserFlow(input);
}


const deleteUserFlow = ai.defineFlow(
  {
    name: 'deleteUserFlow',
    inputSchema: DeleteUserInputSchema,
    outputSchema: DeleteUserOutputSchema,
  },
  async ({ uid }) => {
    console.log(`deleteUserFlow started for UID: ${uid}`);
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: `Failed to delete user: ${errorMessage}` };
    }

    const userDocRef = adminDb.collection('users').doc(uid);

    try {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        // If user document doesn't exist, they might still have an auth account.
        // Proceed to delete from Auth.
        console.warn(`User document for UID ${uid} not found in Firestore. Attempting to delete from Auth.`);
        await adminAuth.deleteUser(uid);
        console.log(`Successfully deleted orphaned user from Firebase Authentication for UID: ${uid}`);
        return { success: true, message: 'User has been successfully deleted.' };
      }
      
      const userProfile = userDoc.data() as UserProfile;

      // Prevent leader from deleting their own account
      if (userProfile.role === 'leader' && userProfile.teamId) {
          return { success: false, message: 'Team leaders cannot delete their own accounts. The team must be deleted by a SPOC or an Admin.' };
      }
      
      const batch = adminDb.batch();

      // If user is a member of a team, remove them from the team.
      if (userProfile.teamId && userProfile.role === 'member') {
        const teamDocRef = adminDb.collection('teams').doc(userProfile.teamId);
        const teamDoc = await teamDocRef.get();

        if (teamDoc.exists) {
            const teamData = teamDoc.data() as Team;
            const memberToRemove = teamData.members.find(m => m.uid === uid);
            
            if (memberToRemove) {
                
                // 1. Remove member from team's array
                batch.update(teamDocRef, { members: FieldValue.arrayRemove(memberToRemove) });

                // 2. Create in-app notification for the leader
                const notificationRef = adminDb.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientUid: teamData.leader.uid,
                    title: "A Member has Left Your Team",
                    message: `${userProfile.name} has left your team "${teamData.name}" by deleting their account.`,
                    read: false,
                    createdAt: FieldValue.serverTimestamp(),
                    link: '/leader'
                });
                
                // 3. Send email notification to leader (outside of batch)
                try {
                    await sendNotificationEmailToLeader(teamData.leader.email, teamData.name, userProfile.name);
                } catch (emailError: any) {
                    console.warn(`User was removed from team, but could not send email to leader ${teamData.leader.email}. Reason: ${emailError.message}`);
                }
            }
        }
      }

      // 4. Log this activity
      const logDocRef = adminDb.collection("logs").doc();
      batch.set(logDocRef, {
          id: logDocRef.id,
          title: "User Account Deleted",
          message: `User ${userProfile.name} (${userProfile.email}) was deleted.`,
          createdAt: FieldValue.serverTimestamp(),
      });

      // 5. Delete user from Firestore
      batch.delete(userDocRef);
      console.log(`Successfully scheduled deletion of user document from Firestore for UID: ${uid}`);

      await batch.commit();

      // 6. Delete user from Firebase Auth
      await adminAuth.deleteUser(uid);
      console.log(`Successfully deleted user from Firebase Authentication for UID: ${uid}`);

      return { success: true, message: 'User has been successfully deleted.' };

    } catch (error) {
      console.error(`Error deleting user with UID ${uid}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to delete user: ${errorMessage}` };
    }
  }
);
