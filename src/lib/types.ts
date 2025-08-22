

export type UserRole = "leader" | "member" | "spoc" | "admin";

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
}

export interface TeamMember {
  uid?: string; // UID is optional until member logs in
  name: string;
  email: string;
  enrollmentNumber: string;
  contactNumber: string;
  gender: "Male" | "Female" | "Other";
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
