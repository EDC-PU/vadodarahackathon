
'use server';
/**
 * @fileOverview A secure flow for a team leader to set their team's mentor details.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { SetMentorDetailsInput, SetMentorDetailsInputSchema, SetMentorDetailsOutput, SetMentorDetailsOutputSchema, Team, UserProfile } from '@/lib/types';
import nodemailer from 'nodemailer';


async function sendSpocMentorUpdateEmail(spocEmail: string, spocName: string, teamName: string) {
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        console.warn("SPOC mentor update email not sent: GMAIL_EMAIL or GMAIL_PASSWORD environment variables not set.");
        return; // Don't throw an error, just log a warning
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const emailText = `
Hi ${spocName},

This is an automated notification to inform you that the team "${teamName}" has saved their mentor's details on the portal.

You can now download the Nomination Form for this team from your dashboard and proceed to nominate the team on the official SIH Portal.

Regards,
Vadodara Hackathon Team
    `;

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: spocEmail,
        subject: `[Action Required] Mentor Details Added for Team "${teamName}"`,
        text: emailText,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Successfully sent mentor update email to SPOC ${spocEmail}`);
    } catch (error) {
        console.error(`Failed to send mentor update email to SPOC ${spocEmail}:`, error);
        // Log the error but don't cause the parent flow to fail
    }
}


export async function setMentorDetails(input: SetMentorDetailsInput): Promise<SetMentorDetailsOutput> {
  return setMentorDetailsFlow(input);
}

const setMentorDetailsFlow = ai.defineFlow(
  {
    name: 'setMentorDetailsFlow',
    inputSchema: SetMentorDetailsInputSchema,
    outputSchema: SetMentorDetailsOutputSchema,
  },
  async ({ teamId, leaderUid, mentor }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    try {
      const teamRef = db.collection('teams').doc(teamId);
      const teamDoc = await teamRef.get();

      if (!teamDoc.exists) {
        return { success: false, message: "Team not found." };
      }
      
      const teamData = teamDoc.data() as Team;

      if (teamData.leader.uid !== leaderUid) {
        return { success: false, message: "Only the team leader can update mentor details." };
      }
      
      if (!teamData.isNominated && !teamData.sihSelectionStatus) {
           return { success: false, message: "This team has not been nominated for SIH, so mentor details cannot be added yet." };
      }

      await teamRef.update({
        mentor: mentor,
      });

      // After successfully saving, notify the SPOC.
      try {
        const spocQuery = db.collection('users')
          .where('institute', '==', teamData.institute)
          .where('role', '==', 'spoc')
          .where('spocStatus', '==', 'approved')
          .limit(1);
        
        const spocSnapshot = await spocQuery.get();
        if (!spocSnapshot.empty) {
          const spoc = spocSnapshot.docs[0].data() as UserProfile;
          await sendSpocMentorUpdateEmail(spoc.email, spoc.name, teamData.name);
        } else {
            console.warn(`Could not find an approved SPOC for institute "${teamData.institute}" to send mentor update notification.`);
        }
      } catch (emailError) {
          console.error("Failed to send SPOC notification after saving mentor details:", emailError);
          // Do not fail the entire flow, just log the error. The primary action (saving details) was successful.
      }


      return {
        success: true,
        message: 'Mentor details have been successfully saved.',
      };
    } catch (error: any) {
      console.error('Error setting mentor details:', error);
      return {
        success: false,
        message: `Failed to save mentor details: ${error.message}`,
      };
    }
  }
);
