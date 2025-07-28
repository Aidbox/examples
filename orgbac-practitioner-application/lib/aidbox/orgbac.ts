import { Reference } from '@/fhir.r4.sdk/types/hl7-fhir-r4-core'

/**
 * Helper functions for working with Organization-Based Access Control
 */
export class OrgBACHelper {
  /**
   * Create a reference to an organization
   */
  static createOrgReference(organizationId: string): Reference {
    return {
      reference: `Organization/${organizationId}`,
      type: 'Organization'
    }
  }

  /**
   * Create a reference to a practitioner role
   */
  static createPractitionerRoleReference(practitionerRoleId: string): Reference {
    return {
      reference: `PractitionerRole/${practitionerRoleId}`,
      type: 'PractitionerRole'
    }
  }

  /**
   * Extract ID from a FHIR reference
   */
  static extractIdFromReference(reference: string): string {
    const parts = reference.split('/')
    return parts[parts.length - 1]
  }

  /**
   * Build organization-scoped URL
   */
  static buildOrgScopedUrl(organizationId: string, resourceType: string, id?: string): string {
    const base = `/Organization/${organizationId}/fhir/${resourceType}`
    return id ? `${base}/${id}` : base
  }

  /**
   * Check if a resource belongs to an organization
   */
  static belongsToOrganization(resource: any, organizationId: string): boolean {
    if (resource.managingOrganization?.reference) {
      return resource.managingOrganization.reference === `Organization/${organizationId}`
    }
    return false
  }
}