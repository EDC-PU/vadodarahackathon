
'use server';
/**
 * @fileOverview Flow to update a jury panel's details.
 */

import { ai } from '@/ai/genkit';
import { UpdateJuryPanelInput, UpdateJuryPanelInputSchema, UpdateJuryPanelOutput, UpdateJuryPanelOutputSchema } from '@/lib/types';
import { getAdminDb } from '@/lib/firebase-admin';

export async function updateJuryPanel(input: UpdateJuryPanelInput): Promise<UpdateJuryPanelOutput> {
  return updateJuryPanelFlow(input);
}

const updateJuryPanelFlow = ai.defineFlow(
  {
    name: 'updateJuryPanelFlow',
    inputSchema: UpdateJuryPanelInputSchema,
    outputSchema: UpdateJuryPanelOutputSchema,
  },
  async ({ panelId, panelName, studentCoordinatorName, studentCoordinatorContact }) => {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return { success: false, message: "Firebase Admin SDK not initialized." };
    }

    try {
      const panelRef = adminDb.collection('juryPanels').doc(panelId);
      await panelRef.update({
        name: panelName,
        studentCoordinatorName: studentCoordinatorName || "",
        studentCoordinatorContact: studentCoordinatorContact || "",
      });

      return {
        success: true,
        message: 'Panel details updated successfully.',
      };
    } catch (error: any) {
      console.error("Error updating jury panel:", error);
      return { success: false, message: `Failed to update panel: ${error.message}` };
    }
  }
);
