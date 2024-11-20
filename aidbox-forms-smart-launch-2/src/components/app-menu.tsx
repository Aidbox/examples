"use client";

import * as React from "react";
import { LayoutDashboard, UserCog, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const data = {
  navMain: [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Patients",
      href: "/patients",
      icon: Users,
    },
    {
      title: "Practitioners",
      href: "/practitioners",
      icon: UserCog,
    },
  ],
};

export function AppMenu() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {data.navMain.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            className={cn(
              "flex items-center gap-3",
              pathname === item.href && "bg-accent text-accent-foreground",
            )}
          >
            <Link href={item.href} className="font-medium">
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
