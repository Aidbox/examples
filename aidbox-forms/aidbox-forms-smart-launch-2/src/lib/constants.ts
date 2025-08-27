export const PAGE_SIZES = [10, 25, 50];

export const DEFAULT_PAGE_SIZE = 10;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
] as const;

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
