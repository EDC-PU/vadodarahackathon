
import DashboardSidebar from "@/components/dashboard-sidebar";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { redirect } from 'next/navigation';
import { getAdminDb } from "@/lib/firebase-admin";
import { UserProfile } from "@/lib/types";
import { headers } from "next/headers";
import { auth } from "@/lib/firebase";

// This is a placeholder for a real session check.
async function checkUserRole() {
    // In a real app, you'd get the session from the request, e.g., using cookies or headers.
    // For this example, we'll assume a way to get the current user's UID.
    // This part is highly dependent on your authentication setup (e.g., NextAuth.js, Clerk, etc.)
    // As we are using Firebase client-side auth, this server-side check is more complex.
    // A robust solution would involve server-side session management or middleware.
    return 'admin'; // Placeholder
}


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <DashboardSidebar />
      </Sidebar>
      <SidebarInset>
        <header className="p-4 border-b md:hidden">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
