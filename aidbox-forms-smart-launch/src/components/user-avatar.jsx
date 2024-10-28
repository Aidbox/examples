import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar.jsx";
import * as React from "react";
import { constructInitials } from "@/lib/utils.js";

export const UserAvatar = ({ user }) => {
  const initials = constructInitials(user.name);

  return (
    <Avatar className="h-8 w-8">
      {user.photo?.[0]?.url || user.photo?.[0]?.data ? (
        <AvatarImage
          src={user.photo?.[0]?.url || user.photo?.[0]?.data}
          alt={name}
        />
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
};
