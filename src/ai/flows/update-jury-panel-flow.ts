
'use server';
/**
 * @fileOverview Flow to update a jury panel's details, including its members.
 */

import { ai } from '@/ai/genkit';
import { UpdateJuryPanelInput, UpdateJuryPanelInputSchema, UpdateJuryPanelOutput, UpdateJuryPanelOutputSchema } from '@/lib/types';
import { getAdminDb } from '@/lib/firebase-admin';
import { writeBatch } from 'firebase-admin/firestore';

export async function updateJuryPanel(input: UpdateJuryPanelInput): Promise<UpdateJuryPanelOutput> {
  return updateJuryPanelFlow(input);
}

const updateJuryPanelFlow = ai.defineFlow(
  {
    name: 'updateJuryPanelFlow',
    inputSchema: UpdateJuryPanelInputSchema,
    outputSchema: UpdateJuryPanelOutputSchema,
  },
  async ({ panelId, panelName, studentCoordinatorName, studentCoordinatorContact, juryMembers }) => {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return { success: false, message: "Firebase Admin SDK not initialized." };
    }

    try {
      const batch = adminDb.batch();

      // 1. Update the panel document
      const panelRef = adminDb.collection('juryPanels').doc(panelId);
      batch.update(panelRef, {
        name: panelName,
        studentCoordinatorName: studentCoordinatorName || "",
        studentCoordinatorContact: studentCoordinatorContact || "",
        // Update the members array with potentially new names, but UIDs and emails remain constant
        members: juryMembers.map(m => ({ uid: m.uid, name: m.name, email: m.email })),
      });

      // 2. Update each jury member's user profile
      for (const member of juryMembers) {
        const userRef = adminDb.collection('users').doc(member.uid);
        batch.update(userRef, {
            name: member.name,
            institute: member.institute,
            contactNumber: member.contactNumber,
            department: member.department,
            highestQualification: member.highestQualification,
            experience: member.experience,
        });
      }

      await batch.commit();

      return {
        success: true,
        message: 'Panel details and jury member profiles updated successfully.',
      };
    } catch (error: any) {
      console.error("Error updating jury panel:", error);
      return { success: false, message: `Failed to update panel: ${error.message}` };
    }
  }
);
