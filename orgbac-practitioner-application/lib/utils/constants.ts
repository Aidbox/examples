// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    VALIDATE: '/api/auth/validate'
  },
  PATIENTS: '/api/patients',
  DASHBOARD: {
    STATS: '/api/dashboard/stats'
  }
} as const

// FHIR Resource Types
export const RESOURCE_TYPES = {
  PATIENT: 'Patient',
  PRACTITIONER: 'Practitioner',
  ORGANIZATION: 'Organization',
  PRACTITIONER_ROLE: 'PractitionerRole',
  APPOINTMENT: 'Appointment',
  ENCOUNTER: 'Encounter',
  USER: 'User'
} as const

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Prefer not to say' }
] as const

// Contact System Types
export const CONTACT_SYSTEMS = {
  PHONE: 'phone',
  EMAIL: 'email',
  FAX: 'fax'
} as const

// Application Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PATIENTS: '/patients',
  PATIENTS_NEW: '/patients/new',
  SETTINGS: '/settings'
} as const

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  PATIENT_CREATED: 'Patient created successfully',
  PATIENT_UPDATED: 'Patient updated successfully',
  REGISTRATION: 'Registration successful! Please log in.',
  LOGIN: 'Login successful',
  LOGOUT: 'Logged out successfully'
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1
} as const