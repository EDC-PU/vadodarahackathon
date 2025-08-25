
import { config } from 'dotenv';
config({ path: '.env.local' });

import '@/ai/flows/registration-tips.ts';
import '@/ai/flows/make-admin-flow.ts';
import '@/ai/flows/create-spoc-flow.ts';
import '@/ai/flows/export-teams-flow.ts';
import '@/ai/flows/system-health-flow.ts';
import '@/ai/flows/manage-spoc-request-flow.ts';
import '@/ai/flows/manage-team-by-spoc-flow.ts';
import '@/ai/flows/notify-admins-flow.ts';
import '@/ai/flows/delete-user-flow.ts';
import '@/ai/flows/get-institute-teams-flow.ts';
import '@/ai/flows/get-team-invite-link-flow.ts';
import '@/ai/flows/get-invite-details-flow.ts';
import '@/ai/flows/add-member-to-team-flow.ts';
import '@/ai/flows/create-team-flow.ts';
import '@/ai/flows/suggest-team-name-flow.ts';
import '@/ai/flows/export-evaluation-flow.ts';
import '@/ai/flows/generate-nomination-form-flow.ts';
import '@/ai/flows/generate-bulk-nomination-flow.ts';
import '@/ai/flows/bulk-upload-ps-flow.ts';
import '@/ai/flows/leave-team-flow.ts';
