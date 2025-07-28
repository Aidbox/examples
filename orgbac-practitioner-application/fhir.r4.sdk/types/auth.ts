export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    practitionerRoleId: string
    organizationId: string
  }
}

export interface AuthSession {
  userId: string
  email: string
  practitionerRoleId: string
  organizationId: string
}