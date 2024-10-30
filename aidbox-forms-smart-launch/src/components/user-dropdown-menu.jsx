import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu.jsx";
import { Button } from "@/ui/button.jsx";
import { ChevronDown, LogOut, Settings2, UserPen } from "lucide-react";
import * as React from "react";
import { UserAvatar } from "@/components/user-avatar.jsx";
import { useLaunchContext } from "@/hooks/use-launch-context.jsx";
import { constructName } from "@/lib/utils.js";
import { useClient } from "@/hooks/use-client.jsx";
import { useNavigate } from "react-router-dom";

export const UserDropdownMenu = () => {
  const { user } = useLaunchContext();
  const client = useClient();
  const navigate = useNavigate();

  const logout = () => {
    client._clearState?.();
    navigate("/");
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center h-11">
          <UserAvatar user={user} />
          <span className="hidden md:block">{constructName(user.name)}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem>
          <UserPen />
          {user.resourceType} profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings2 />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
