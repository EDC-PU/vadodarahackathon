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
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";

const navItems = {
  admin: [
    { href: "/admin", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/admin/spocs", icon: <UserCheck />, label: "Manage SPOCs" },
    { href: "/admin/teams", icon: <Users />, label: "All Teams" },
    { href: "/admin/settings", icon: <Settings />, label: "Event Settings" },
  ],
  spoc: [
    { href: "/spoc", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/spoc/teams", icon: <Users />, label: "Institute Teams" },
  ],
  leader: [
    { href: "/leader", icon: <LayoutDashboard />, label: "Team Dashboard" },
    { href: "/leader/members", icon: <UserPlus />, label: "Manage Members" },
  ],
  member: [
    { href: "/member", icon: <LayoutDashboard />, label: "Dashboard" },
    { href: "/member/team", icon: <Users />, label: "My Team" },
    { href: "/member/spoc", icon: <FileText />, label: "SPOC Details" },
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
  const { user, loading, handleSignOut } = useAuth();
  
  if (loading || !user) {
    // You can return a loading spinner or a placeholder here
    return null; 
  }
  
  const activeRole = user.role as keyof typeof navItems;
  const items = navItems[activeRole] || [];

  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 w-full p-2">
          <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={32} height={32} />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            VH 6.0 Portal
          </span>
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
