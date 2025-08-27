import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as React from "react";
import { constructAddress, constructGender, constructName } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { getCurrentPatient, getCurrentUser } from "@/lib/server/smart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyIdMenuItem } from "@/components/copy-id-menu-item";

export async function PatientCard({}) {
  const patient = await getCurrentPatient();
  const user = await getCurrentUser();

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
            <CopyIdMenuItem id={patient.id as string} />
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
}
