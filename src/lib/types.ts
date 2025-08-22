
export type UserRole = "leader" | "member" | "spoc" | "admin";

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  photoURL?: string;
  institute: string;
  department: string;
  enrollmentNumber: string;
  contactNumber: string;
  gender: "Male" | "Female" | "Other";
  teamId?: string;
}

export interface TeamMember {
  uid?: string; // UID is optional until member logs in
  name: string;
  email: string;
  enrollmentNumber: string;
  contactNumber: string;
  gender: "Male" | "Female" | "Other";
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
