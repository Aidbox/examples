"use client";

import { Copy } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import * as React from "react";

export function CopyIdMenuItem({ id }: { id: string }) {
  return (
    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(id)}>
      <Copy />
      Copy ID
    </DropdownMenuItem>
  );
}
