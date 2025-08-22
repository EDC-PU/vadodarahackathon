
import {z} from 'genkit';
import type {Query} from 'firebase-admin/firestore';

export type UserRole = "leader" | "member" | "spoc" | "admin";
export type SpocStatus = "pending" | "approved" | "rejected";
export type InvitationStatus = "pending" | "accepted" | "rejected";

export interface UserProfile {
  uid: string;
  role?: UserRole; // Role is optional until team registration is complete
  name: string;
  email: string;
  photoURL?: string;
  institute?: string;
  department?: string;
  enrollmentNumber?: string;
  contactNumber?: string;
  gender?: "Male" | "Female" | "Other";
  teamId?: string;
  passwordChanged?: boolean; // Flag to check if the user has changed the initial password
  spocStatus?: SpocStatus;
  semester?: number;
  yearOfStudy?: string;
}

export interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  email: string;
  status: InvitationStatus;
  createdAt: any;
}


export interface TeamMember {
  uid: string; 
  name: string;
  email: string;
  enrollmentNumber: string;
  contactNumber: string;
  gender: "Male" | "Female" | "Other";
  semester?: number;
  yearOfStudy?: string;
}

export type ProblemStatementCategory = "Software" | "Hardware" | "Hardware & Software";

export interface ProblemStatement {
  id: string;
  problemStatementId: string;
  title: string;
  description: string;
  category: ProblemStatementCategory;
  organization: string;
  department: string;
  theme: string;
  youtubeLink?: string;
  datasetLink?: string;
  contactInfo?: string;
}

export interface Team {
  id: string;
  name: string;
  leader: {
    uid: string;
    name: string;
    email: string;
  };
  institute: string;
  department: string;
  category?: "Software" | "Hardware" | "Hardware & Software";
  members: TeamMember[];
  problemStatementId?: string;
  problemStatementTitle?: string;
  teamNumber?: string;
}

export interface Institute {
  id: string;
  name: string;
}

export interface Spoc extends UserProfile {
  role: "spoc";
  institute: string;
}

export interface EventInfo {
  dates: string;
  rewards: string[];
  brochureUrl: string;
  problemStatementsUrl: string;
}

export type AnnouncementAudience = "all" | "teams" | "spocs";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  audience: AnnouncementAudience;
  url?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}


// Schemas for Genkit Flows

// create-spoc-flow
export const CreateSpocInputSchema = z.object({
  name: z.string().describe('Full name of the SPOC.'),
  email: z.string().email().describe('Email address for the SPOC account.'),
  institute: z.string().describe('The institute the SPOC belongs to.'),
  contactNumber: z.string().describe('The contact number of the SPOC.'),
});
export type CreateSpocInput = z.infer<typeof CreateSpocInputSchema>;

export const CreateSpocOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});
export type CreateSpocOutput = z.infer<typeof CreateSpocOutputSchema>;


// export-teams-flow
export const ExportTeamsInputSchema = z.object({
    institute: z.string().optional().describe("Filter teams by institute. 'All Institutes' for no filter."),
    category: z.string().optional().describe("Filter teams by category. 'All Categories' for no filter."),
});
export type ExportTeamsInput = z.infer<typeof ExportTeamsInputSchema>;

export const ExportTeamsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    fileContent: z.string().optional().describe("Base64 encoded content of the Excel file."),
    fileName: z.string().optional(),
});
export type ExportTeamsOutput = z.infer<typeof ExportTeamsOutputSchema>;

// invite-member-flow
export const InviteMemberInputSchema = z.object({
  teamId: z.string().describe("The ID of the team to add the member to."),
  teamName: z.string().describe("The name of the team."),
  memberEmail: z.string().email().describe("The email address of the new member to invite."),
});
export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;

export const InviteMemberOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});
export type InviteMemberOutput = z.infer<typeof InviteMemberOutputSchema>;


// make-admin-flow
export const MakeAdminInputSchema = z.object({
  email: z.string().email().describe('The email of the user to make an admin.'),
});
export type MakeAdminInput = z.infer<typeof MakeAdminInputSchema>;

export const MakeAdminOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  uid: z.string().optional(),
});
export type MakeAdminOutput = z.infer<typeof MakeAdminOutputSchema>;

// manage-spoc-request-flow
export const ManageSpocRequestInputSchema = z.object({
  uid: z.string().describe("The UID of the SPOC user to manage."),
  action: z.enum(['approve', 'reject']).describe("The action to perform."),
});
export type ManageSpocRequestInput = z.infer<typeof ManageSpocRequestInputSchema>;

export const ManageSpocRequestOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ManageSpocRequestOutput = z.infer<typeof ManageSpocRequestOutputSchema>;

// manage-team-by-spoc-flow
export const ManageTeamBySpocInputSchema = z.object({
  teamId: z.string().describe("The ID of the team to manage."),
  action: z.enum(['remove-member', 'delete-team']).describe("The action to perform."),
  memberEmail: z.string().email().optional().describe("The email of the member to remove (required for 'remove-member' action)."),
});
export type ManageTeamBySpocInput = z.infer<typeof ManageTeamBySpocInputSchema>;

export const ManageTeamBySpocOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ManageTeamBySpocOutput = z.infer<typeof ManageTeamBySpocOutputSchema>;

// notify-admins-flow
export const NotifyAdminsInputSchema = z.object({
  spocName: z.string().describe("The name of the SPOC who registered."),
  spocEmail: z.string().email().describe("The email of the SPOC."),
  spocInstitute: z.string().describe("The institute of the SPOC."),
});
export type NotifyAdminsInput = z.infer<typeof NotifyAdminsInputSchema>;

export const NotifyAdminsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});
export type NotifyAdminsOutput = z.infer<typeof NotifyAdminsOutputSchema>;


// registration-tips
export const RegistrationTipsInputSchema = z.object({
  field: z.string().describe('The form field the user is currently filling out.'),
  value: z.string().optional().describe('The current value entered by the user in the field.'),
  formContext: z
    .string()
    .optional()
    .describe('Context about the form the user is filling out.'),
});
export type RegistrationTipsInput = z.infer<typeof RegistrationTipsInputSchema>;

export const RegistrationTipsOutputSchema = z.object({
  tip: z.string().describe('A helpful tip for the user to consider.'),
});
export type RegistrationTipsOutput = z.infer<typeof RegistrationTipsOutputSchema>;

// system-health-flow
const ServiceStatusSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const EnvVarDetailsSchema = z.object({
    key: z.string(),
    set: z.boolean(),
});

const EnvVarsStatusSchema = ServiceStatusSchema.extend({
  details: z.array(EnvVarDetailsSchema),
});

const FirestoreStatusSchema = ServiceStatusSchema.extend({
  canRead: z.boolean(),
  canWrite: z.boolean(),
});

const AuthStatusSchema = ServiceStatusSchema.extend({
  canListUsers: z.boolean(),
});

const StorageStatusSchema = ServiceStatusSchema.extend({
  bucketExists: z.boolean(),
  bucket: z.string().optional(),
});

export const SystemHealthStateSchema = z.object({
  envVars: EnvVarsStatusSchema,
  serviceAccount: ServiceStatusSchema,
  firestore: FirestoreStatusSchema,
  auth: AuthStatusSchema,
  storage: StorageStatusSchema,
  timestamp: z.string(),
});
export type SystemHealthState = z.infer<typeof SystemHealthStateSchema>;
