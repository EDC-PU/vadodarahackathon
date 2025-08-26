
"use client";

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Settings,
  Shield,
  LogOut,
  UserCheck,
  FileQuestion,
  Wrench,
  BookUser,
  Building2,
  Megaphone,
  User as UserIcon,
  BarChart2,
  HeartPulse,
  UserRoundCheck,
  Users2,
  List,
  Library,
  ClipboardCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "./ui/skeleton";

const navItems = {
  admin: [
    { href: "/admin", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/admin/analytics", icon: <BarChart2 />, label: "Analytics" },
    { href: "/admin/announcements", icon: <Megaphone />, label: "Announcements" },
    { href: "/admin/problem-statements", icon: <FileQuestion />, label: "Problem Statements" },
    { href: "/admin/teams", icon: <Users />, label: "All Teams" },
    { href: "/admin/users", icon: <Users2 />, label: "Manage Users" },
    { href: "/admin/institutes", icon: <Library />, label: "Manage Institutes" },
    { href: "/admin/departments", icon: <List />, label: "Manage Departments" },
    { href: "/admin/spocs", icon: <Building2 />, label: "Manage SPOCs" },
    { href: "/admin/spoc-requests", icon: <UserRoundCheck />, label: "SPOC Requests" },
    { href: "/admin/admins", icon: <Shield />, label: "Manage Admins" },
    { href: "/admin/settings", icon: <Wrench />, label: "Event Settings" },
    { href: "/admin/system-health", icon: <HeartPulse />, label: "System Health" },
  ],
  spoc: [
    { href: "/spoc", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/spoc/teams", icon: <Users />, label: "All Teams" },
    { href: "/spoc/analytics", icon: <BarChart2 />, label: "Analytics" },
    { href: "/spoc/evaluation", icon: <ClipboardCheck />, label: "Evaluation & Nomination" },
    { href: "/spoc/departments", icon: <List />, label: "Manage Departments" },
    { href: "/spoc/announcements", icon: <Megaphone />, label: "Announcements" },
  ],
  leader: [
    { href: "/leader", icon: <LayoutDashboard />, label: "Team Dashboard" },
  ],
  member: [
    { href: "/member", icon: <LayoutDashboard />, label: "Dashboard" },
  ],
};

const getProfileLink = (user: any) => {
    if (!user || !user.enrollmentNumber) return null;
    return {
        href: `/profile/${user.enrollmentNumber}`,
        icon: <UserIcon />,
        label: "My Profile"
    }
};


const RoleIcon = ({ role }: { role: string }) => {
  switch (role) {
    case "admin": return <Shield className="w-4 h-4" />;
    case "spoc": return <UserCheck className="w-4 h-4" />;
    case "leader": return <Users className="w-4 h-4" />;
    default: return <UserIcon className="w-4 h-4" />;
  }
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user, loading, handleSignOut } = useAuth();
  
  if (loading) {
    return (
      <>
        <SidebarHeader className="border-b p-2">
           <div className="flex items-center gap-2 w-full p-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-6 w-32" />
           </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t p-2">
          <div className="flex items-center gap-3 w-full p-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </SidebarFooter>
      </>
    )
  }

  if (!user) return null;
  
  const activeRole = user.role as keyof typeof navItems;
  let items = navItems[activeRole] || [];

  const profileLink = getProfileLink(user);
  if ((activeRole === 'leader' || activeRole === 'member') && profileLink) {
    // Ensure the profile link is not already in the list
    if (!items.some(item => item.href === profileLink.href)) {
        items.push(profileLink);
    }
  }


  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-center gap-2 w-full p-2 h-16">
          <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={164} height={164} />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <div className="flex items-center gap-3 w-full p-2">
          <Avatar>
            <AvatarImage src={user.photoURL || undefined} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
            <span className="font-semibold">{user.name}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RoleIcon role={activeRole} />
              <span className="capitalize">{activeRole}</span>
            </div>
          </div>
           <Button variant="ghost" size="icon" onClick={handleSignOut} className="ml-auto group-data-[collapsible=icon]:hidden">
                <LogOut className="w-4 h-4"/>
           </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
