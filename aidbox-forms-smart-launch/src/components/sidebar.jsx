import {
  Sidebar as Sidebar_,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/ui/sidebar.jsx";
import * as React from "react";
import {
  ClipboardList,
  FileQuestion,
  Home,
  Settings,
  SquareMenu,
  Users,
} from "lucide-react";
import { PatientCard } from "@/components/patient-card.jsx";
import { Link, useLocation } from "react-router-dom";
import { useLaunchContext } from "@/hooks/use-launch-context.jsx";

export const Sidebar = () => {
  const { user } = useLaunchContext();
  const location = useLocation();

  return (
    <Sidebar_ className="border-r">
      <SidebarHeader className="h-16 items-center flex-row px-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {user.resourceType === "Patient" ? "Patient Portal" : "Provider EHR"}
        </h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === "/"}>
              <Link to={"/"}>
                <Home className="mr-2 h-5 w-5" />
                Dashboard
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {user.resourceType === "Practitioner" && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Users className="mr-2 h-5 w-5" />
                  Patients
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <ClipboardList className="mr-2 h-5 w-5" />
                  Appointments
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarSeparator />
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/questionnaires"}
                >
                  <Link to="/questionnaires">
                    <FileQuestion className="mr-2 h-5 w-5" />
                    Questionnaires
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/questionnaire-responses"}
            >
              <Link to="/questionnaire-responses">
                <SquareMenu className="mr-2 h-5 w-5" />
                Questionnaire Responses
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarSeparator />
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <PatientCard />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar_>
  );
};
