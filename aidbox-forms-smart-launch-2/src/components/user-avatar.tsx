import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Patient, Practitioner } from "fhir/r4";
import { constructInitials } from "@/lib/utils";

export function UserAvatar({ user }: { user: Patient | Practitioner }) {
  const initials = constructInitials(user.name);

  return (
    <Avatar className="h-8 w-8">
      {user.photo?.[0]?.url || user.photo?.[0]?.data ? (
        <AvatarImage src={user.photo?.[0]?.url || user.photo?.[0]?.data} />
      ) : (
        <AvatarFallback
          className={
            user.resourceType === "Patient"
              ? "bg-pink-400 text-pink-50"
              : "bg-teal-400 text-teal-50"
          }
        >
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
