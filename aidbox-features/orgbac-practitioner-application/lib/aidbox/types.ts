import { 
  Patient, 
  Practitioner, 
  Organization, 
  PractitionerRole,
  Bundle,
  OperationOutcome
} from '@/fhir.r4.sdk/types/hl7-fhir-r4-core'

// Re-export commonly used types
export type { Patient, Practitioner, Organization, PractitionerRole, Bundle, OperationOutcome }

// Aidbox-specific types
export interface AidboxResource {
  id: string
  resourceType: string
  meta?: {
    lastUpdated?: string
    versionId?: string
  }
}

export interface AidboxUser extends AidboxResource {
  resourceType: 'User'
  email: string
  password?: string
  fhirUser?: {
    reference: string
  }
}

export interface AidboxClient extends AidboxResource {
  resourceType: 'Client'
  id: string
  secret?: string
  grant_types?: string[]
}

export interface AidboxAccessPolicy extends AidboxResource {
  resourceType: 'AccessPolicy'
  engine: string
  matchers?: any
}

// API Response types
export interface AidboxOperationOutcome {
  resourceType: 'OperationOutcome'
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information'
    code: string
    details?: {
      text: string
    }
  }>
}

export interface AidboxBundle<T = any> {
  resourceType: 'Bundle'
  type: 'searchset' | 'batch' | 'transaction' | 'history' | 'document' | 'message'
  total?: number
  entry?: Array<{
    resource: T
    fullUrl?: string
  }>
}