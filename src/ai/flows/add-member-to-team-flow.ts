
'use server';
/**
 * @fileOverview A secure flow to add a new user to a team and notify the leader.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { AddMemberToTeamInput, AddMemberToTeamInputSchema, AddMemberToTeamOutput, AddMemberToTeamOutputSchema, Team } from '@/lib/types';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-templates';

async function sendNewMemberNotificationEmail(leaderEmail: string, leaderName: string, teamName: string, newMember: { name: string, email: string, contactNumber?: string }) {
  console.log(`Attempting to send new member notification to: ${leaderEmail}`);
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

    const emailHtml = getEmailTemplate({
        title: "A New Member Has Joined Your Team!",
        body: `
            <p>Hi ${leaderName},</p>
            <p>Great news! A new member has just joined your team, <strong>${teamName}</strong>. Here are their details:</p>
            <div class="credentials">
                <p><strong>Name:</strong> ${newMember.name}</p>
                <p><strong>Email:</strong> ${newMember.email}</p>
                <p><strong>Contact:</strong> ${newMember.contactNumber || 'N/A'}</p>
            </div>
            <p>You can view your full team roster on your dashboard.</p>
        `,
        buttonLink: "https://vadodarahackathon.pierc.org/leader",
        buttonText: "Go to Your Dashboard"
    });

    const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: leaderEmail,
        subject: `New Member Alert: ${newMember.name} joined ${teamName}`,
        html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Successfully sent new member notification to ${leaderEmail}.`);
}

export async function addMemberToTeam(input: AddMemberToTeamInput): Promise<AddMemberToTeamOutput> {
  console.log("Executing addMemberToTeam function...");
  return addMemberToTeamFlow(input);
}

const addMemberToTeamFlow = ai.defineFlow(
  {
    name: 'addMemberToTeamFlow',
    inputSchema: AddMemberToTeamInputSchema,
    outputSchema: AddMemberToTeamOutputSchema,
  },
  async ({
    userId,
    teamId,
    name,
    email,
    enrollmentNumber,
    contactNumber,
    gender,
    semester,
    yearOfStudy
  }) => {
    console.log(`addMemberToTeamFlow started for User ID: ${userId}, Team ID: ${teamId}`);
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      const errorMessage = "Firebase Admin SDK is not initialized.";
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const teamDocRef = adminDb.collection('teams').doc(teamId);

    try {
      const teamDoc = await teamDocRef.get();
      if (!teamDoc.exists) {
        throw new Error(`Team with ID ${teamId} not found.`);
      }
      const teamData = teamDoc.data() as Team;
      
      if (!teamData.members) {
        teamData.members = [];
      }
      
      if (teamData.members.length >= 5) {
          throw new Error("This team is already full.");
      }

      const newMember = {
          uid: userId,
          name: name,
          email: email,
          enrollmentNumber: enrollmentNumber || 'N/A',
          contactNumber: contactNumber || 'N/A',
          gender: gender || 'O',
          semester: semester,
          yearOfStudy: yearOfStudy,
      };

      const batch = adminDb.batch();
      
      const currentMembers = teamData.members || [];
      currentMembers.push(newMember);
      batch.update(teamDocRef, {
        members: currentMembers
      });
      
      batch.update(userDocRef, {
        teamId: teamId
      });

      await batch.commit();
      
      // Send notification email to the team leader
      try {
        await sendNewMemberNotificationEmail(
            teamData.leader.email, 
            teamData.leader.name, 
            teamData.name, 
            { name: newMember.name, email: newMember.email, contactNumber: newMember.contactNumber }
        );
      } catch (emailError: any) {
        console.warn(`User was added to the team, but failed to send notification email to leader ${teamData.leader.email}. Reason: ${emailError.message}`);
        // Do not fail the whole flow if email fails, but log it.
      }


      return {
        success: true,
        message: `Successfully added ${name} to ${teamData.name}.`,
      };

    } catch (error) {
      console.error(`Error adding user ${userId} to team ${teamId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message: `Failed to add member to team: ${errorMessage}` };
    }
  }
);
