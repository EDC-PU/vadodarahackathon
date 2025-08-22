
'use server';

/**
 * @fileOverview Provides AI-generated tips for users filling out registration forms.
 *
 * - getRegistrationTips - A function that generates helpful tips for completing a registration form.
 * - RegistrationTipsInput - The input type for the getRegistrationTips function.
 * - RegistrationTipsOutput - The return type for the getRegistrationTips function.
 */

import {ai} from '@/ai/genkit';
import { RegistrationTipsInput, RegistrationTipsInputSchema, RegistrationTipsOutput, RegistrationTipsOutputSchema } from '@/lib/types';


export async function getRegistrationTips(input: RegistrationTipsInput): Promise<RegistrationTipsOutput> {
  return registrationTipsFlow(input);
}

const teamNamePrompt = ai.definePrompt({
  name: 'teamNameTipsPrompt',
  input: {schema: RegistrationTipsInputSchema},
  output: {schema: RegistrationTipsOutputSchema},
  prompt: `You are a helpful assistant that provides tips to users filling out registration forms.

  The user is currently filling out the '{{field}}' field.
  Your tip should be about creating a creative and unique team name that reflects the team's identity and the spirit of the Vadodara Hackathon 6.0.
  Suggest a few creative names directly for a hackathon event.
  The names should be short and catchy. For example: "Code Crusaders", "Byte Busters", or "Vadodara Voyagers".
  
  Do not provide any introductory or closing salutations.
  `,
});

const defaultPrompt = ai.definePrompt({
  name: 'defaultRegistrationTipsPrompt',
  input: {schema: RegistrationTipsInputSchema},
  output: {schema: RegistrationTipsOutputSchema},
  prompt: `You are a helpful assistant that provides tips to users filling out registration forms.

  The user is currently filling out the '{{field}}' field.
  The current value they have entered is '{{value}}'.
  Here's some context about the form: {{formContext}}

  Provide a single, concise tip to help the user fill out this field correctly and completely.
  The tip should be no more than 2 sentences. Focus on accuracy and completeness of the field.
  If there is nothing helpful to say, say nothing.
  
  Do not provide any introductory or closing salutations.
  `,
});


const registrationTipsFlow = ai.defineFlow(
  {
    name: 'registrationTipsFlow',
    inputSchema: RegistrationTipsInputSchema,
    outputSchema: RegistrationTipsOutputSchema,
  },
  async input => {
    let promptToUse;
    if (input.field === 'Team Name') {
        promptToUse = teamNamePrompt;
    } else {
        promptToUse = defaultPrompt;
    }

    const {output} = await promptToUse(input);
    return output!;
  }
);
