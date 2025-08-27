import { FHIRBundle, FHIRResource } from '../types/health-card';

export class BundleBuilder {
  createHealthCardBundle(
    patient: FHIRResource,
    resources: FHIRResource[],
    includeIdentityClaim: boolean = true
  ): FHIRBundle {
    const bundleEntries: Array<{ resource: FHIRResource }> = [];

    // Add patient resource with identity claims
    if (includeIdentityClaim) {
      const patientCopy = this.createPatientWithIdentityClaims(patient);
      bundleEntries.push({ resource: patientCopy });
    }

    // Add clinical resources
    resources.forEach(resource => {
      const resourceCopy = this.sanitizeResource(resource);
      bundleEntries.push({ resource: resourceCopy });
    });

    return {
      resourceType: 'Bundle',
      type: 'collection',
      entry: bundleEntries,
    };
  }

  private createPatientWithIdentityClaims(patient: FHIRResource): FHIRResource {
    const patientCopy: FHIRResource = {
      resourceType: 'Patient',
    };

    // Include basic identity claims per SMART Health Cards spec
    if (patient.name && patient.name.length > 0) {
      patientCopy.name = patient.name.map((name: any) => ({
        family: name.family,
        given: name.given,
      }));
    }

    if (patient.birthDate) {
      patientCopy.birthDate = patient.birthDate;
    }

    return patientCopy;
  }

  private sanitizeResource(resource: FHIRResource): FHIRResource {
    // SMART Health Cards specification requires removal of:
    // - Resource.id elements
    // - Resource.meta elements (except .meta.security if present)
    // - DomainResource.text elements
    // - CodeableConcept.text elements (recursively)
    // - Coding.display elements (recursively)
    
    return this.deepSanitize(resource);
  }

  private deepSanitize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        // Skip mandatory SMART Health Cards removals
        if (key === 'id' || key === 'text') {
          continue;
        }

        // Handle meta - only keep .meta.security if present
        if (key === 'meta') {
          if (value && typeof value === 'object' && (value as any).security) {
            sanitized[key] = { security: (value as any).security };
          }
          continue;
        }

        // For CodeableConcept objects, remove .text
        if (key === 'text' && obj.coding) {
          continue; // Skip text field in CodeableConcept
        }

        // For Coding objects, remove .display
        if (key === 'display' && (obj.system || obj.code)) {
          continue; // Skip display field in Coding
        }

        // Recursively sanitize nested objects and arrays
        sanitized[key] = this.deepSanitize(value);
      }

      return sanitized;
    }

    return obj;
  }

  filterByValueSet(
    resources: FHIRResource[],
    valueSetUrl?: string
  ): FHIRResource[] {
    if (!valueSetUrl) {
      return resources;
    }

    // Basic value set filtering - in a real implementation,
    // this would validate against actual FHIR ValueSet resources
    // eslint-disable-next-line no-console
    console.warn(
      `Value set filtering not fully implemented for: ${valueSetUrl}`
    );
    return resources;
  }
}
