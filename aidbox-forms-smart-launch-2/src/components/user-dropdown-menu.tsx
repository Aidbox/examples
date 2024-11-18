import { ChevronDown, LogOut, Settings2, UserPen } from "lucide-react";
import { getCurrentUser } from "@/lib/smart";
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

export async function UserDropdownMenu() {
  const user = await getCurrentUser();

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
        <DropdownMenuItem>
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
