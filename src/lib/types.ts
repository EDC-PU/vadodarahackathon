
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
  misId?: string; // For SPOCs
  contactNumber?: string;
  gender?: "M" | "F" | "O";
  teamId?: string;
  passwordChanged?: boolean; // Flag to check if the user has changed the initial password
  spocStatus?: SpocStatus;
  semester?: number;
  yearOfStudy?: string;
  createdAt?: {
      seconds: number,
      nanoseconds: number,
  } | null;
}

export interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  email: string;
  status: InvitationStatus;
  createdAt: any;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  createdAt: any;
}

export interface Notification {
    id: string;
    recipientUid: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: any;
    link?: string;
}

export interface DepartmentList {
    id: string;
    name: string;
    departments: string[];
}


export interface TeamMember {
  uid: string; 
  name: string;
  email: string;
  enrollmentNumber: string;
  contactNumber: string;
  gender: "M" | "F" | "O";
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

export type AnnouncementAudience = "all" | "teams" | "spocs" | "institute";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | null;
  audience: AnnouncementAudience;
  institute?: string; // Only for 'institute' audience
  url?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}


// Schemas for Genkit Flows

// suggest-team-name-flow
export const SuggestTeamNameOutputSchema = z.object({
    success: z.boolean(),
    suggestions: z.array(z.string()).optional(),
    message: z.string().optional(),
});
export type SuggestTeamNameOutput = z.infer<typeof SuggestTeamNameOutputSchema>;


// create-team-flow
export const CreateTeamInputSchema = z.object({
    teamName: z.string(),
    leaderUid: z.string(),
    leaderEmail: z.string().email(),
    name: z.string(),
    gender: z.enum(["M", "F", "O"]),
    institute: z.string(),
    department: z.string(),
    enrollmentNumber: z.string(),
    contactNumber: z.string(),
    semester: z.number(),
    yearOfStudy: z.string(),
});
export type CreateTeamInput = z.infer<typeof CreateTeamInputSchema>;

export const CreateTeamOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  teamId: z.string().optional(),
});
export type CreateTeamOutput = z.infer<typeof CreateTeamOutputSchema>;


// add-member-to-team-flow
export const AddMemberToTeamInputSchema = z.object({
  userId: z.string().describe("The UID of the new user to add."),
  teamId: z.string().describe("The ID of the team to join."),
  name: z.string().describe("The name of the user."),
  email: z.string().email().describe("The email of the user."),
  enrollmentNumber: z.string().optional().describe("The enrollment number of the user."),
  contactNumber: z.string().optional().describe("The contact number of the user."),
  gender: z.enum(["M", "F", "O"]).optional().describe("The gender of the user."),
  semester: z.number().optional().describe("The semester of the user."),
  yearOfStudy: z.string().optional().describe("The year of study of the user."),
});
export type AddMemberToTeamInput = z.infer<typeof AddMemberToTeamInputSchema>;

export const AddMemberToTeamOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type AddMemberToTeamOutput = z.infer<typeof AddMemberToTeamOutputSchema>;


// get-invite-details-flow
export const GetInviteDetailsInputSchema = z.object({
  inviteId: z.string().describe("The ID of the invitation document."),
});
export type GetInviteDetailsInput = z.infer<typeof GetInviteDetailsInputSchema>;

export const GetInviteDetailsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  teamName: z.string().optional(),
  leaderName: z.string().optional(),
  teamId: z.string().optional(),
});
export type GetInviteDetailsOutput = z.infer<typeof GetInviteDetailsOutputSchema>;

// delete-user-flow
export const DeleteUserInputSchema = z.object({
  uid: z.string().describe('The UID of the user to be deleted.'),
});
export type DeleteUserInput = z.infer<typeof DeleteUserInputSchema>;

export const DeleteUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteUserOutput = z.infer<typeof DeleteUserOutputSchema>;


// create-spoc-flow
export const CreateSpocInputSchema = z.object({
  name: z.string().describe('Full name of the SPOC.'),
  email: z.string().email().describe('Email address for the SPOC account.'),
  institute: z.string().describe('The institute the SPOC belongs to.'),
  contactNumber: z.string().describe('The contact number of the SPOC.'),
  gender: z.enum(["M", "F", "O"]).describe('The gender of the SPOC.'),
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
    status: z.string().optional().describe("Filter teams by registration status. 'All Statuses' for no filter."),
    problemStatementIds: z.array(z.string()).optional().describe("Filter teams by selected problem statement IDs."),
});
export type ExportTeamsInput = z.infer<typeof ExportTeamsInputSchema>;

export const ExportTeamsOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    fileContent: z.string().optional().describe("Base64 encoded content of the Excel file."),
    fileName: z.string().optional(),
});
export type ExportTeamsOutput = z.infer<typeof ExportTeamsOutputSchema>;

// export-evaluation-flow
const TeamForEvaluationSchema = z.object({
    team_id: z.string(),
    team_name: z.string(),
    leader_name: z.string(),
    problemstatement_number: z.string(),
    problem_title: z.string(),
});
export const ExportEvaluationInputSchema = z.object({
    instituteName: z.string(),
    teams: z.array(TeamForEvaluationSchema),
});
export type ExportEvaluationInput = z.infer<typeof ExportEvaluationInputSchema>;

export const ExportEvaluationOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    fileContent: z.string().optional().describe("Base64 encoded content of the Excel file."),
    fileName: z.string().optional(),
});
export type ExportEvaluationOutput = z.infer<typeof ExportEvaluationOutputSchema>;

// get-institute-teams-flow
export const GetInstituteTeamsInputSchema = z.object({
  institute: z.string().describe("The name of the institute to fetch teams for."),
});
export type GetInstituteTeamsInput = z.infer<typeof GetInstituteTeamsInputSchema>;

export const GetInstituteTeamsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  teams: z.array(z.any()).optional().describe("An array of team objects."),
  users: z.record(z.any()).optional().describe("A map of user profiles, with UID as the key."),
});
export type GetInstituteTeamsOutput = z.infer<typeof GetInstituteTeamsOutputSchema>;

// get-team-invite-link-flow
export const GetTeamInviteLinkInputSchema = z.object({
  teamId: z.string().describe("The ID of the team."),
  teamName: z.string().describe("The name of the team."),
  baseUrl: z.string().url().describe("The base URL of the application."),
});
export type GetTeamInviteLinkInput = z.infer<typeof GetTeamInviteLinkInputSchema>;

export const GetTeamInviteLinkOutputSchema = z.object({
  success: z.boolean(),
  inviteLink: z.string().url().optional(),
  message: z.string().optional(),
});
export type GetTeamInviteLinkOutput = z.infer<typeof GetTeamInviteLinkOutputSchema>;


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


// bulk-upload-ps-flow
export const BulkUploadPsInputSchema = z.object({
  fileContent: z.string().describe('Base64 encoded content of the Excel file.'),
});
export type BulkUploadPsInput = z.infer<typeof BulkUploadPsInputSchema>;

export const BulkUploadPsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  addedCount: z.number().optional(),
  failedCount: z.number().optional(),
  errors: z.array(z.string()).optional(),
});
export type BulkUploadPsOutput = z.infer<typeof BulkUploadPsOutputSchema>;

// leave-team-flow
export const LeaveTeamInputSchema = z.object({
  userId: z.string().describe("The UID of the user leaving the team."),
});
export type LeaveTeamInput = z.infer<typeof LeaveTeamInputSchema>;

export const LeaveTeamOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type LeaveTeamOutput = z.infer<typeof LeaveTeamOutputSchema>;
