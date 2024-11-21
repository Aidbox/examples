export const PAGE_SIZES = {
  DEFAULT: 10,
  OPTIONS: [10, 25, 50] as const,
} as const;

export type ValidPageSize = (typeof PAGE_SIZES.OPTIONS)[number];

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] as const;

export type ValidGender = (typeof GENDER_OPTIONS)[number]["value"];

export const SMART_LAUNCH_SCOPES = [
  "openid",
  "fhirUser",
  "profile",
  "offline_access",
  "launch",
  "launch/patient",
  "patient/*.rs",
  "user/*.rs",
];

export const SMART_LAUNCH_CLIENT_ID = "aidbox-forms";

export const SMART_LAUNCH_TYPES = [
  "provider-ehr",
  "patient-portal",
  "provider-standalone",
  "patient-standalone",
  "backend-service",
] as const;
