# Vadodara Hackathon Portal - Application Flows

This document outlines the primary user flows for the Vadodara Hackathon Portal, detailing the registration process, dashboard functionalities, and key actions available to each user role.

## Table of Contents
1.  [User Roles](#user-roles)
2.  [Admin Flow](#admin-flow)
3.  [SPOC (Single Point of Contact) Flow](#spoc-flow)
4.  [Team Leader Flow](#team-leader-flow)
5.  [Team Member Flow](#team-member-flow)

---

## 1. User Roles

The portal has four distinct user roles with specific permissions and capabilities:

*   **Admin:** Has super-user privileges with complete control over the entire portal, user management, and event settings.
*   **SPOC (Single Point of Contact):** A faculty or staff member representing a specific institute. They manage their institute's teams, hackathon dates, and nominations.
*   **Team Leader:** A student who registers and creates a team. They are responsible for managing their team members and selecting a problem statement.
*   **Team Member:** A student who joins a team after being invited by a Team Leader.

---

## 2. Admin Flow

Admins have the highest level of access and are responsible for the overall management of the hackathon portal.

### Key Actions:
*   **Login:** Admins log in using their pre-assigned credentials.
*   **Dashboard Overview:** View high-level statistics and a real-time feed of recent portal activities (e.g., new teams, user deletions, SPOC approvals).
*   **Manage Admins:** Grant or revoke admin privileges to other users.
*   **Manage SPOCs:**
    *   Create new, pre-approved SPOC accounts. Credentials are automatically emailed.
    *   View a list of all registered SPOCs and their complete profile details, including AICTE and Principal information.
*   **Approve SPOC Requests:** Review and approve or reject registration requests from new SPOCs.
*   **Manage All Teams:**
    *   View a comprehensive list of all teams with powerful filtering options.
    *   Edit team names.
    *   Remove individual members from any team.
    *   Delete entire teams.
    *   Export filtered team data to an Excel file.
*   **Manage University Nominations:**
    *   View a list of all teams nominated by Institute SPOCs for the university-level round.
    *   After the event date, set the final selection status for each team (e.g., "Selected for SIH - University Level" or "Selected for SIH - Institute Level").
*   **Manage Users:** View a list of all registered users and delete user accounts if necessary.
*   **Manage Problem Statements:** Add, edit, bulk upload, and delete hackathon problem statements.
*   **Manage Announcements:** Create and delete announcements visible to specific audiences (All Users, Teams, or SPOCs).
*   **Manage Institutes & Nomination Limits:**
    *   Add or remove institutes from the portal.
    *   Set the maximum number of teams each institute is allowed to nominate for the university-level round.
*   **Event Settings:** Configure global settings, such as the registration deadline and the date when SPOCs can export evaluation data.
*   **System Health:** Run diagnostics to check the connectivity and health of backend services.

---

## 3. SPOC Flow

SPOCs act as the bridge between the hackathon organizers and the participating teams from their respective institutes.

### Registration and Approval:
1.  **Register:** A user selects the "Institute SPOC" role on the registration page using their official `@paruluniversity.ac.in` email.
2.  **Complete Profile:** After creating an account, they are redirected to a form to complete their profile (Name, Institute, Contact, AICTE number, Principal's name and email, etc.).
3.  **Submit for Approval:** Upon submission, their request is sent to the Admins for review. The SPOC account is disabled at this stage.
4.  **Login (Post-Approval):** Once an Admin approves the request, the SPOC can log in and access their dashboard.

### Key Actions:
*   **Dashboard:** View teams and participant counts specifically for their institute.
*   **Manage Institute Teams:**
    *   View a detailed list of all teams registered from their institute.
    *   Edit team names.
    *   Remove members from teams.
    *   Delete entire teams.
    *   Get a shareable invite link for any team.
*   **Evaluation & Nomination:**
    *   Set the two dates for their institute's internal hackathon (must be between Sept 1-4, 2025). This can be changed until a fixed deadline (Aug 31, 2025).
    *   After their hackathon dates pass, they can nominate a set number of teams (limit controlled by Admin) for the university-level round.
*   **SSIH Enrollment:**
    *   View a list of teams that were nominated but not selected for the university-level SIH.
    *   Mandatorily enroll these teams in the State Smart India Hackathon (SSIH) 2025.
*   **Manage Departments:** Add or remove department names to be listed for students during registration.
*   **Export Data:** Export their institute's team data to Excel and generate a pre-formatted evaluation sheet after the admin-set date.
*   **View Announcements:** See announcements targeted at SPOCs and all users.

---

## 4. Team Leader Flow

Team Leaders are responsible for creating and managing their teams.

### Registration Flow:
1.  **Register:** A user selects the "Team Leader" role during signup.
2.  **Create Team & Profile:** After creating an account, they are redirected to a form where they must:
    *   Enter their team's name.
    *   Complete their own detailed profile (enrollment number, department, etc.).
3.  **Dashboard Access:** Upon successful submission, their team is created, they are assigned as the leader, and they gain access to the Leader Dashboard.

### Key Actions:
*   **Dashboard:** View their team members, problem statement selection, and team registration status (e.g., number of members, female representation).
*   **Invite Members:** Generate and share a unique, permanent link to invite members to their team. A team is complete with 6 members.
*   **Manage Members:** Remove members from the team roster.
*   **Select Problem Statement:** Choose a problem statement for the team from a list. This can be changed until the event deadline.
*   **View Notifications:** Receive notifications when a new member joins the team.
*   **View Announcements:** See announcements targeted at teams and all users, including institute-specific ones from their SPOC.

---

## 5. Team Member Flow

Team members are the core participants of the hackathon.

### Registration Flow:
1.  **Invited:** A team member cannot register directly. They must receive an invitation link from a Team Leader.
2.  **Register via Link:** Clicking the link takes them to a special registration page with the context of the team they are joining.
3.  **Create Account:** They create their user account (or log in if they already have one).
4.  **Complete Profile:** If their profile is incomplete, they are redirected to a form to provide their details (enrollment number, department, etc.).
5.  **Join Team:** Upon completing their profile, they are automatically added to the team that invited them.

### Key Actions:
*   **Dashboard:** View their team's details, including the leader, other members, and the selected problem statement.
*   **View Announcements:** See announcements targeted at teams and all users.
*   **Leave Team:** A member can choose to leave their current team from their dashboard.
*   **Edit Profile:** View and edit their own profile information.
