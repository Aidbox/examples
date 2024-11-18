import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { HumanName } from "fhir/r4";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function constructName(name: HumanName[] | undefined) {
  if (!name) {
    return "Unknown";
  } else if (name?.[0]["text"]) {
    return `${name?.[0].text}`;
  } else {
    const prefix = name?.[0].prefix?.[0] ?? "";
    const givenName = name?.[0].given?.[0] ?? "";
    const familyName = name?.[0].family ?? "";

    return `${prefix} ${givenName} ${familyName}`.replace(/\s+/g, " ").trim();
  }
}

export function constructInitials(name: HumanName[] | undefined) {
  const [givenName, familyName] = constructName(name).split(" ");
  return familyName
    ? `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase()
    : givenName.substring(0, 2).toUpperCase();
}

export function sha256(message: string) {
  return crypto.createHash("sha256").update(message).digest("hex");
}
