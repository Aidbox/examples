// Aidbox-specific resource types that are not part of FHIR standard

export interface AidboxUser {
  resourceType: 'User'
  id: string
  email: string
  password?: string
  fhirUser?: {
    reference?: string
    id?: string
    resourceType?: string
  }
  meta?: {
    lastUpdated?: string
    versionId?: string
    extension?: Array<{
      url: string
      value: any
    }>
  }
}

export interface AidboxClient {
  resourceType: 'Client'
  id: string
  secret?: string
  grant_types?: string[]
  auth?: {
    authorization_code?: {
      redirect_uri?: string
      access_token_expiration?: number
      refresh_token?: boolean
    }
  }
  meta?: {
    lastUpdated?: string
    versionId?: string
  }
}

export interface AidboxAccessPolicy {
  resourceType: 'AccessPolicy'
  id: string
  engine: string
  description?: string
  matcho?: any
  meta?: {
    lastUpdated?: string
    versionId?: string
  }
}

export interface AidboxTokenIntrospector {
  resourceType: 'TokenIntrospector'
  id: string
  type: 'jwt' | 'opaque'
  jwt?: {
    iss: string
    secret: string
  }
  meta?: {
    lastUpdated?: string
    versionId?: string
  }
}

// Form data types for UI components
export interface PatientFormData {
  firstName: string
  lastName: string
  birthDate: string
  gender: 'male' | 'female' | 'other' | 'unknown'
  phone: string
  email: string
  addressLine: string
  city: string
  state: string
  postalCode: string
}