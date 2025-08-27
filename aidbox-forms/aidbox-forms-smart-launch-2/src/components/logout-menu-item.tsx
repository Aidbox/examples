"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutMenuItem({
  onClickAction,
}: {
  onClickAction: () => void;
}) {
  return (
    <DropdownMenuItem onClick={() => onClickAction()}>
      <LogOut className="h-4 w-4" />
      <span>Log out</span>
    </DropdownMenuItem>
  );
}
