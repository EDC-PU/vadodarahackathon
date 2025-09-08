
'use server';
/**
 * @fileOverview Flow to delete a jury panel and all associated user accounts.
 */

import { ai } from '@/ai/genkit';
import { DeleteJuryPanelInput, DeleteJuryPanelInputSchema, DeleteJuryPanelOutput, DeleteJuryPanelOutputSchema, JuryPanel } from '@/lib/types';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function deleteJuryPanel(input: DeleteJuryPanelInput): Promise<DeleteJuryPanelOutput> {
  return deleteJuryPanelFlow(input);
}

const deleteJuryPanelFlow = ai.defineFlow(
  {
    name: 'deleteJuryPanelFlow',
    inputSchema: DeleteJuryPanelInputSchema,
    outputSchema: DeleteJuryPanelOutputSchema,
  },
  async ({ panelId }) => {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    if (!adminDb || !adminAuth) {
      return { success: false, message: "Firebase Admin SDK not initialized." };
    }

    const panelRef = adminDb.collection('juryPanels').doc(panelId);
    
    try {
        const panelDoc = await panelRef.get();
        if (!panelDoc.exists) {
            return { success: false, message: "Panel not found." };
        }
        const panelData = panelDoc.data() as JuryPanel;
        
        const batch = adminDb.batch();

        // 1. Un-assign teams from this panel
        const teamsQuery = adminDb.collection('teams').where('panelId', '==', panelId);
        const teamsSnapshot = await teamsQuery.get();
        teamsSnapshot.forEach(doc => {
            batch.update(doc.ref, { panelId: FieldValue.delete() });
        });

        // 2. Delete the jury member user documents and Auth accounts
        for (const member of panelData.members) {
            // It's possible a member has a draft entry without a UID
            if (member.uid) {
                const userRef = adminDb.collection('users').doc(member.uid);
                batch.delete(userRef);
                try {
                    await adminAuth.deleteUser(member.uid);
                } catch (error: any) {
                    // It's possible the auth user was already deleted. Log a warning but continue.
                    console.warn(`Could not delete auth user ${member.uid} (may already be deleted): ${error.message}`);
                }
            }
        }
        
        // 3. Delete the panel document itself
        batch.delete(panelRef);

        await batch.commit();

        return {
            success: true,
            message: `Panel "${panelData.name}" and its ${panelData.members.length} jury members have been deleted.`,
        };

    } catch (error: any) {
        console.error("Error deleting jury panel:", error);
        return { success: false, message: `Failed to delete panel: ${error.message}` };
    }
  }
);
