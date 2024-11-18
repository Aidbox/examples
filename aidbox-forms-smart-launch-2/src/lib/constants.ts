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
