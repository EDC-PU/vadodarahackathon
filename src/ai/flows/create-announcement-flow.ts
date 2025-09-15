
'use server';
/**
 * @fileOverview A flow to create an announcement and notify relevant users.
 */

import { ai } from '@/ai/genkit';
import { CreateAnnouncementInput, CreateAnnouncementInputSchema, CreateAnnouncementOutput, CreateAnnouncementOutputSchema, Team, UserProfile } from '@/lib/types';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, Query } from 'firebase-admin/firestore';
import { getEmailTemplate } from '@/lib/email-templates';
import nodemailer from 'nodemailer';

async function sendAnnouncementEmail(recipients: string[], title: string, content: string, url?: string) {
    if (recipients.length === 0) {
        console.log("No recipients to send announcement email to.");
        return;
    }
    
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
        console.error("GMAIL_EMAIL or GMAIL_PASSWORD environment variables not set.");
        throw new Error("Missing GMAIL_EMAIL or GMAIL_PASSWORD environment variables.");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const emailHtml = getEmailTemplate({
        title: `Announcement: ${title}`,
        body: `<p>${content.replace(/\n/g, '<br>')}</p>`,
        buttonLink: url || "https://vadodarahackathon.pierc.org/",
        buttonText: url ? "Learn More" : "Visit Portal",
        theme: 'light',
    });

    const mailOptions = {
        from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
        to: recipients.join(','),
        subject: `[Vadodara Hackathon] Announcement: ${title}`,
        html: emailHtml,
    };

    console.log(`Sending announcement email to ${recipients.length} user(s).`);
    await transporter.sendMail(mailOptions);
    console.log("Successfully sent announcement emails.");
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<CreateAnnouncementOutput> {
  return createAnnouncementFlow(input);
}

const createAnnouncementFlow = ai.defineFlow(
  {
    name: 'createAnnouncementFlow',
    inputSchema: CreateAnnouncementInputSchema,
    outputSchema: CreateAnnouncementOutputSchema,
  },
  async ({ title, content, url, audience, authorName, institute }) => {
    const db = getAdminDb();
    if (!db) {
        return { success: false, message: "Database connection failed." };
    }

    try {
        const announcementData: any = {
            title,
            content,
            url,
            audience,
            authorName,
            createdAt: FieldValue.serverTimestamp(),
        };

        if (audience === 'institute' && institute) {
            announcementData.institute = institute;
        }

        const announcementRef = db.collection("announcements").doc();
        await announcementRef.set(announcementData);

        let message = "Announcement posted successfully.";

        // If audience is a nominated group, send emails
        if (audience === 'university_nominated' || audience === 'institute_nominated') {
            const status = audience === 'university_nominated' ? 'university' : 'institute';
            console.log(`Audience is ${audience}. Fetching leaders to email...`);
            
            let nominatedTeamsQuery: Query = db.collection('teams').where('sihSelectionStatus', '==', status);
            
            // For institute-nominated, SPOC must also filter by their institute
            if (audience === 'institute_nominated' && institute) {
                nominatedTeamsQuery = nominatedTeamsQuery.where('institute', '==', institute);
            }
            
            const snapshot = await nominatedTeamsQuery.get();

            if (snapshot.empty) {
                console.log("No nominated teams found to notify.");
                message += " No teams found for this nomination status.";
            } else {
                const leaderEmails = snapshot.docs.map(doc => (doc.data() as Team).leader.email);
                const uniqueEmails = [...new Set(leaderEmails)];
                
                await sendAnnouncementEmail(uniqueEmails, title, content, url);
                message += ` Emailed ${uniqueEmails.length} team leader(s).`;
            }
        }
        
        return { success: true, message };

    } catch (error: any) {
        console.error("Error creating announcement:", error);
        return { success: false, message: `Failed to create announcement: ${error.message}` };
    }
  }
);
