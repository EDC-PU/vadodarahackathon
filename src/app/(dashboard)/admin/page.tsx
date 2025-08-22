import AdminDashboard from "@/components/admin-dashboard";
import { redirect } from 'next/navigation';

export default function AdminPage() {
  // The root admin page now just shows the overview.
  // We can redirect to a specific page or show the overview component.
  return <AdminDashboard />;
}
