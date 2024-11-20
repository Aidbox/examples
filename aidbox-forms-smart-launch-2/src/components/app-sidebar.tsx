import * as React from "react";
import Image from "next/image";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { PatientCard } from "@/components/patient-card";
import { AppMenu } from "@/components/app-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                  <Image
                    src="/health-samurai.svg"
                    alt="Health Samurai Logo"
                    width={24}
                    height={24}
                    priority
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Aidbox Forms</span>
                  <span className="">v{process.env.NEXT_PUBLIC_VERSION}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <AppMenu />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <PatientCard />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
