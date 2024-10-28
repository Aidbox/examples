import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card.jsx";
import * as React from "react";
import { useLaunchContext } from "@/hooks/use-launch-context.jsx";
import {
  constructAddress,
  constructGender,
  constructName,
} from "@/lib/utils.js";
import { UserAvatar } from "@/components/user-avatar.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu.jsx";
import { Button } from "@/ui/button.jsx";
import { Copy, MoreHorizontal } from "lucide-react";

export const PatientCard = () => {
  const { patient, user } = useLaunchContext();

  if (!patient || user.resourceType === "Patient") {
    return undefined;
  }

  const name = constructName(patient.name);
  const age = patient.birthDate
    ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
    : "unknown";
  const address = patient.address
    ? constructAddress(patient.address)
    : "unknown";
  const gender = constructGender(patient.gender);

  return (
    <Card className="mx-4 mb-4 shadow-none">
      <CardHeader className="px-4 space-y-0 py-2 border-b flex-row items-center">
        <CardTitle>Current Patient</CardTitle>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 ml-auto">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(patient.id)}
            >
              <Copy />
              Copy ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3 mb-2">
          <UserAvatar user={patient} />
          <div className="flex flex-col text-sm">
            <div className=" font-medium">{name}</div>
            <div className="text-xs text-muted-foreground">
              {gender}, {age} years old
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{address}</div>
      </CardContent>
    </Card>
  );
};
