
'use server';
/**
 * @fileOverview A flow to notify a team leader when their team is nominated by their SPOC.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { Team, UserProfile } from '@/lib/types';
import nodemailer from 'nodemailer';

const NotifyLeaderInputSchema = z.object({
  teamId: z.string().describe("The ID of the team that was nominated."),
});
type NotifyLeaderInput = z.infer<typeof NotifyLeaderInputSchema>;

const NotifyLeaderOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type NotifyLeaderOutput = z.infer<typeof NotifyLeaderOutputSchema>;


async function sendNominationEmail(leaderEmail: string, leaderName: string, teamName: string) {
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        console.warn("SPOC nomination notification email not sent: GMAIL_EMAIL or GMAIL_PASSWORD environment variables not set.");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const emailText = `
Dear ${leaderName},

Congratulations on being nominated for Smart India Hackathon (SIH) 2025 from the Institute level! 🎉 This is a proud moment and a great opportunity to showcase your team’s innovation on a national platform.

As part of the next step, all nominated team leaders are requested to choose a mentor who will accompany your team during the SIH 2025 offline rounds. Please note the following important points:

- If your team is shortlisted by the SIH Screening Committee, you will be required to travel to the respective SIH center, which can be anywhere across India.
- The mentor’s presence with the team is mandatory at the allotted center.

Hence, kindly select your mentor thoughtfully and ensure they will be available to travel with the team if required.

Once you have finalized your mentor, please nominate them through your Vadodara Hackathon 6.0 Portal (Leader Login).

Portal Link: https://vadodarahackathon.pierc.org/leader

We wish you and your team the very best for the upcoming stages of SIH 2025. May this journey bring you great learning and success!

Regards,
Vadodara Hackathon Team
    `;

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: leaderEmail,
        subject: `[Action Required] Your Team "${teamName}" has been Nominated for SIH 2025 (Institute Level)`,
        text: emailText,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Successfully sent SIH nomination email to leader ${leaderEmail}`);
    } catch (error) {
        console.error(`Failed to send SIH nomination email to leader ${leaderEmail}:`, error);
        // Log the error but don't cause the parent flow to fail
    }
}


export async function notifyLeaderOfNomination(input: NotifyLeaderInput): Promise<NotifyLeaderOutput> {
  return notifyLeaderOfNominationFlow(input);
}

const notifyLeaderOfNominationFlow = ai.defineFlow(
  {
    name: 'notifyLeaderOfNominationFlow',
    inputSchema: NotifyLeaderInputSchema,
    outputSchema: NotifyLeaderOutputSchema,
  },
  async ({ teamId }) => {
    const db = getAdminDb();
    if (!db) {
      return { success: false, message: 'Database connection failed.' };
    }

    try {
      const teamDoc = await db.collection('teams').doc(teamId).get();
      if (!teamDoc.exists) {
        throw new Error("Team not found.");
      }
      const team = teamDoc.data() as Team;

      // The leader's email is stored directly on the team document.
      const leaderEmail = team.leader.email;
      const leaderName = team.leader.name;
      
      if (!leaderEmail || !leaderName) {
        throw new Error("Team leader details are missing.");
      }

      await sendNominationEmail(leaderEmail, leaderName, team.name);

      return {
        success: true,
        message: `Nomination notification sent to ${leaderName}.`,
      };
    } catch (error: any) {
      console.error(`Error notifying leader for team ${teamId}:`, error);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
      };
    }
  }
);
