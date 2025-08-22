export type UserRole = "leader" | "member" | "spoc" | "admin";

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  institute?: string;
  teamId?: string;
  enrollmentNumber?: string;
}

export interface TeamMember {
  uid: string;
  name: string;
  email: string;
  enrollmentNumber: string;
  contactNumber: string;
  gender: "Male" | "Female" | "Other";
}

export interface Team {
  id: string;
  name: string;
  leader: UserProfile;
  institute: string;
  department: string;
  category: "Software" | "Hardware";
  members: TeamMember[];
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
