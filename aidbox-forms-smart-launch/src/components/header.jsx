import { SidebarTrigger } from "@/ui/sidebar.jsx";
import { Button } from "@/ui/button.jsx";
import { Bell } from "lucide-react";
import * as React from "react";
import { UserDropdownMenu } from "@/components/user-dropdown-menu.jsx";

export function Header({ title }) {
  return (
    <header className="flex h-16 items-center border-b px-4 flex-shrink-0 gap-4">
      <SidebarTrigger />
      {title}
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <UserDropdownMenu />
      </div>
    </header>
  );
}
