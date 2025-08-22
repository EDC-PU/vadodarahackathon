
'use server';
/**
 * @fileOverview Flow to notify all admins about a new SPOC registration request.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { UserProfile, NotifyAdminsInput, NotifyAdminsInputSchema, NotifyAdminsOutput, NotifyAdminsOutputSchema } from '@/lib/types';


async function sendSpocRequestEmail(adminEmails: string[], spocName: string, spocInstitute: string) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: adminEmails.join(','), // Send to all admins
        subject: `New SPOC Registration Request`,
        html: `
            <h1>New SPOC Request</h1>
            <p>A new SPOC has registered and is awaiting approval.</p>
            <ul>
                <li><strong>Name:</strong> ${spocName}</li>
                <li><strong>Institute:</strong> ${spocInstitute}</li>
            </ul>
            <p>Please visit the admin dashboard to approve or reject this request.</p>
            <p><a href="http://localhost:9002/admin/spoc-requests">Click here to manage requests</a></p>
            <br/>
            <p>This is an automated notification from the Vadodara Hackathon Portal.</p>
        `,
    };

    await transporter.sendMail(mailOptions);
}


export async function notifyAdminsOfSpocRequest(input: NotifyAdminsInput): Promise<NotifyAdminsOutput> {
    return notifyAdminsFlow(input);
}


const notifyAdminsFlow = ai.defineFlow(
  {
    name: 'notifyAdminsFlow',
    inputSchema: NotifyAdminsInputSchema,
    outputSchema: NotifyAdminsOutputSchema,
  },
  async ({ spocName, spocEmail, spocInstitute }) => {
    try {
        const adminDb = getAdminDb();
        
        // 1. Fetch all admin users
        const adminsQuery = adminDb.collection('users').where('role', '==', 'admin');
        const adminSnapshot = await adminsQuery.get();

        if (adminSnapshot.empty) {
            return { success: false, message: 'No admins found to notify.' };
        }

        const adminEmails = adminSnapshot.docs.map(doc => (doc.data() as UserProfile).email);

        // 2. Send email notification to all admins
        await sendSpocRequestEmail(adminEmails, spocName, spocInstitute);
        
        // 3. (Future) Create in-app notification document in Firestore
        // const notificationRef = adminDb.collection('notifications').doc();
        // await notificationRef.set({ ... });


        return {
            success: true,
            message: `Successfully notified ${adminEmails.length} admin(s).`,
        };

    } catch (error: any) {
      console.error("Error notifying admins:", error);
      let errorMessage = error.message || "An unknown error occurred.";
       if ((error as any).code === 'EAUTH' || errorMessage.toLowerCase().includes('invalid login')) {
          errorMessage = 'Could not send email. Please check your GMAIL_EMAIL and GMAIL_PASSWORD in the .env file. You may need to use a Google App Password.';
      }
      return { success: false, message: `Failed to notify admins: ${errorMessage}` };
    }
  }
);
