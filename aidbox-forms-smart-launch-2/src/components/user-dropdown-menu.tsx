import { ChevronDown, Settings2, UserPen } from "lucide-react";
import { getCurrentUser } from "@/lib/server/smart";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { constructName } from "@/lib/utils";
import { LogoutMenuItem } from "@/components/logout-menu-item";
import { getSession } from "@/lib/server/session";

export async function UserDropdownMenu() {
  const user = await getCurrentUser();

  async function logoutAction() {
    "use server";

    const session = await getSession();
    session.destroy();
  }

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
        <LogoutMenuItem onClickAction={logoutAction} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
