"use client";

import * as React from "react";
import {
  FileQuestion,
  LayoutDashboard,
  Library,
  LucideIcon,
  SquareMenu,
  UserCog,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const data: {
  label?: string;
  children: {
    icon: LucideIcon;
    href: string;
    title: string;
    children?: {
      icon: LucideIcon;
      href: string;
      title: string;
    }[];
  }[];
}[] = [
  {
    children: [
      {
        title: "Dashboard",
        href: "/dashboard",
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
      {
        title: "Questionnaires",
        href: "/questionnaires",
        icon: FileQuestion,
      },
      {
        title: "Questionnaire Responses",
        href: "/questionnaire-responses",
        icon: SquareMenu,
      },
    ],
  },
  {
    label: "Public Library",
    children: [
      {
        title: "Questionnaires",
        href: "/public-library/questionnaires",
        icon: Library,
      },
    ],
  },
];

export function AppMenu() {
  const pathname = usePathname();

  return (
    <>
      {data.map((group, index) => (
        <SidebarGroup key={index}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.children.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                  {item.children && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === child.href}
                          >
                            <Link href={child.href}>
                              <child.icon className="mr-2 h-4 w-4" />
                              {child.title}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
