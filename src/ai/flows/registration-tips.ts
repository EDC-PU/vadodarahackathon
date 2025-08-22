
'use server';

/**
 * @fileOverview Provides AI-generated tips for users filling out registration forms.
 *
 * - getRegistrationTips - A function that generates helpful tips for completing a registration form.
 * - RegistrationTipsInput - The input type for the getRegistrationTips function.
 * - RegistrationTipsOutput - The return type for the getRegistrationTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RegistrationTipsInputSchema = z.object({
  field: z.string().describe('The form field the user is currently filling out.'),
  value: z.string().optional().describe('The current value entered by the user in the field.'),
  formContext: z
    .string()
    .optional()
    .describe('Context about the form the user is filling out.'),
});
export type RegistrationTipsInput = z.infer<typeof RegistrationTipsInputSchema>;

const RegistrationTipsOutputSchema = z.object({
  tip: z.string().describe('A helpful tip for the user to consider.'),
});
export type RegistrationTipsOutput = z.infer<typeof RegistrationTipsOutputSchema>;

export async function getRegistrationTips(input: RegistrationTipsInput): Promise<RegistrationTipsOutput> {
  return registrationTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'registrationTipsPrompt',
  input: {schema: RegistrationTipsInputSchema},
  output: {schema: RegistrationTipsOutputSchema},
  prompt: `You are a helpful assistant that provides tips to users filling out registration forms.

  The user is currently filling out the '{{field}}' field.
  The current value they have entered is '{{value}}'.
  Here's some context about the form: {{formContext}}

  {{#if (eq field "Team Name")}}
  Your tip should be about creating a creative and unique team name that reflects the team's identity and the spirit of the Vadodara Hackathon 6.0.
  Suggest a few creative names directly for a hackathon event.
  The names should be short and catchy. For example: "Code Crusaders", "Byte Busters", or "Vadodara Voyagers".
  {{else}}
  Provide a single, concise tip to help the user fill out this field correctly and completely.
  The tip should be no more than 2 sentences. Focus on accuracy and completeness of the field.
  If there is nothing helpful to say, say nothing.
  {{/if}}
  
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
    const {output} = await prompt(input);
    return output!;
  }
);
