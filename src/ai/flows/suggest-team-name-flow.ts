
'use server';
/**
 * @fileOverview A flow to suggest unique and creative team names for the hackathon.
 */

import { ai } from '@/ai/genkit';
import { getAdminDb } from '@/lib/firebase-admin';
import { SuggestTeamNameOutput, SuggestTeamNameOutputSchema } from '@/lib/types';
import { z } from 'zod';

export async function suggestTeamName(): Promise<SuggestTeamNameOutput> {
  return suggestTeamNameFlow();
}

const SuggestionSchema = z.object({
    suggestions: z.array(z.string()).describe("An array of 5 creative and unique team names.")
});


const suggestTeamNameFlow = ai.defineFlow(
  {
    name: 'suggestTeamNameFlow',
    outputSchema: SuggestTeamNameOutputSchema,
  },
  async () => {
    const db = getAdminDb();
    if (!db) {
        return { success: false, message: "Database connection failed." };
    }

    try {
        const teamsSnapshot = await db.collection('teams').get();
        const existingNames = teamsSnapshot.docs.map(doc => doc.data().name);

        const prompt = ai.definePrompt({
            name: 'teamNameSuggestionPrompt',
            output: { schema: SuggestionSchema },
            prompt: `You are an assistant for a hackathon. Suggest 5 creative, short, and catchy team names for a participant.
            The names should be unique. Here is a list of team names that are already taken, do not suggest these:
            ${existingNames.join(', ')}

            Provide only the array of names in the 'suggestions' field.
            `,
        });

        const { output } = await prompt();
        
        if (!output || !output.suggestions) {
             return { success: false, message: "Could not generate suggestions." };
        }

        return {
            success: true,
            suggestions: output.suggestions,
        };

    } catch (error: any) {
        console.error("Error suggesting team name:", error);
        return { success: false, message: `Failed to suggest team name: ${error.message}` };
    }
  }
);
