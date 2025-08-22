"use client";

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
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
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

// Mock user role for demonstration
const userRole = "leader"; // Can be 'admin', 'spoc', 'leader', 'member'

const navItems = {
  admin: [
    { href: "/dashboard/admin", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/dashboard/admin/spocs", icon: <UserCheck />, label: "Manage SPOCs" },
    { href: "/dashboard/admin/teams", icon: <Users />, label: "All Teams" },
    { href: "/dashboard/admin/settings", icon: <Settings />, label: "Event Settings" },
  ],
  spoc: [
    { href: "/dashboard/spoc", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/dashboard/spoc/teams", icon: <Users />, label: "Institute Teams" },
  ],
  leader: [
    { href: "/dashboard/leader", icon: <LayoutDashboard />, label: "Team Dashboard" },
    { href: "/dashboard/leader/members", icon: <UserPlus />, label: "Manage Members" },
  ],
  member: [
    { href: "/dashboard/member", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/dashboard/member/team", icon: <Users />, label: "My Team" },
    { href: "/dashboard/member/spoc", icon: <FileText />, label: "SPOC Details" },
  ],
};

const RoleIcon = ({ role }: { role: string }) => {
  switch (role) {
    case "admin": return <Shield className="w-4 h-4" />;
    case "spoc": return <UserCheck className="w-4 h-4" />;
    case "leader": return <Users className="w-4 h-4" />;
    default: return null;
  }
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const activeRole = userRole as keyof typeof navItems;
  const items = navItems[activeRole];

  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 w-full p-2">
          <Logo className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            VH 6.0 Portal
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
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
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
            <span className="font-semibold">Team Leader Name</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RoleIcon role={activeRole} />
              <span className="capitalize">{activeRole}</span>
            </div>
          </div>
           <Link href="/login" className="ml-auto group-data-[collapsible=icon]:hidden">
            <Button variant="ghost" size="icon">
                <LogOut className="w-4 h-4"/>
            </Button>
           </Link>
        </div>
      </SidebarFooter>
    </>
  );
}
