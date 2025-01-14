import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Address, Bundle, HumanName, Resource } from "fhir/r4";
import crypto from "crypto";
import { SMART_LAUNCH_TYPES } from "@/lib/constants";

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

export const constructAddress = (address: Address[]) => {
  const line = address[0].line?.[0] ?? "";
  const city = address[0].city ?? "";
  const state = address[0].state ?? "";
  const postalCode = address[0].postalCode ?? "";
  const country = address[0].country ?? "";

  return `${line}, ${city}, ${state} ${postalCode}, ${country}`;
};

export function constructGender(gender: string | undefined) {
  return gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "unknown";
}

export function sha256(message: string) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

export function readableStreamToObject(stream: ReadableStream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  return new Promise<object>(async (resolve) => {
    await reader.read().then(async function process({ done, value }) {
      if (!done) {
        result += decoder.decode(value, { stream: true });
        return await process(await reader.read());
      }

      resolve(JSON.parse(result));
    });
  });
}

export function createSmartAppLauncherUrl({
  launchUrl,
  launchType,
  fhirVersion = "r4",
}: {
  launchUrl: string;
  launchType: (typeof SMART_LAUNCH_TYPES)[number];
  fhirVersion?: string;
}) {
  const params = new URLSearchParams();
  params.set("fhir_version", fhirVersion);
  params.set("launch_url", launchUrl);
  params.set(
    "launch",
    btoa(JSON.stringify([SMART_LAUNCH_TYPES.indexOf(launchType)])),
  );

  return `https://launch.smarthealthit.org/?${params.toString()}`;
}

export function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null;
}

export function isBundle<T extends Resource = Resource>(
  resource: any,
): resource is Bundle<T> {
  return "resourceType" in resource && resource.resourceType === "Bundle";
}

export function getFirst<T extends Resource = Resource>(
  resource: T | Bundle<T>,
): T {
  if (isBundle<T>(resource)) {
    const first = resource.entry?.[0].resource;
    if (!first) {
      throw new Error("Resource not found");
    }
    return first;
  } else {
    return resource;
  }
}

export function typeSafeObjectFromEntries<
  const T extends ReadonlyArray<readonly [PropertyKey, unknown]>,
>(entries: T): { [K in T[number] as K[0]]: K[1] } {
  return Object.fromEntries(entries) as { [K in T[number] as K[0]]: K[1] };
}

export function ago(time: Date): string {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = new Date();

  const secondsElapsed = Math.round(
    Math.max(0, now.getTime() - time.getTime()) / 1000,
  );

  const minutesElapsed = Math.floor(secondsElapsed / 60);
  const hoursElapsed = Math.floor(minutesElapsed / 60);
  const daysElapsed = Math.floor(hoursElapsed / 24);

  if (secondsElapsed < 60) {
    return formatter.format(-secondsElapsed, "second");
  } else if (minutesElapsed < 60) {
    return formatter.format(-minutesElapsed, "minute");
  } else if (hoursElapsed < 24) {
    return formatter.format(-hoursElapsed, "hour");
  } else {
    return formatter.format(-daysElapsed, "day");
  }
}
