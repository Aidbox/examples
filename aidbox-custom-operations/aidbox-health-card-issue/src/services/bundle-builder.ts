import { FHIRBundle, FHIRResource } from '../types/health-card';

/**
 * `includeIdentityClaim` per the operation is a repeating string of claim paths
 * (e.g. "Patient.name", "Patient.birthDate"). We also tolerate a boolean for
 * backward compatibility: true → default claims, false → omit the Patient.
 */
export type IdentityClaimInput = boolean | string[] | undefined;

/** Maps a minified card entry (`resource:N`) back to its source FHIR reference. */
export interface ResourceLinkRef {
  bundledResource: string; // e.g. "resource:0"
  reference: string; // e.g. "Patient/example-patient"
}

export interface BundleWithLinks {
  bundle: FHIRBundle;
  links: ResourceLinkRef[];
}

const DEFAULT_IDENTITY_CLAIMS = ['Patient.name', 'Patient.birthDate'];

export class BundleBuilder {
  createHealthCardBundle(
    patient: FHIRResource,
    resources: FHIRResource[],
    includeIdentityClaim: IdentityClaimInput = true
  ): BundleWithLinks {
    const claims = this.resolveIdentityClaims(includeIdentityClaim);

    // Ordered list of resources that will populate the bundle. The Patient (if
    // included) is always resource:0 so clinical references resolve to it.
    const ordered: FHIRResource[] = [];
    if (claims) {
      ordered.push(this.createPatientWithIdentityClaims(patient, claims));
    }
    ordered.push(...resources.map(r => this.sanitizeResource(r)));

    // Map original absolute references (ResourceType/id) → short resource:N URIs.
    // Built from the ORIGINAL resources (ids are stripped during sanitization).
    // The same mapping is surfaced as `links` for the resourceLink OUT param.
    const refMap = new Map<string, string>();
    const links: ResourceLinkRef[] = [];
    const originals: FHIRResource[] = [];
    if (claims) originals.push(patient);
    originals.push(...resources);
    originals.forEach((r, i) => {
      if (r?.resourceType && r?.id) {
        const bundledResource = `resource:${i}`;
        refMap.set(`${r.resourceType}/${r.id}`, bundledResource);
        links.push({ bundledResource, reference: `${r.resourceType}/${r.id}` });
      }
    });

    const entry = ordered.map((resource, i) => ({
      fullUrl: `resource:${i}`,
      // Rewrite references, then drop empty elements (the validator rejects
      // empty "", [], {} — and dropping a dangling reference can leave one).
      resource: this.pruneEmpty(this.rewriteReferences(resource, refMap)),
    }));

    return {
      bundle: { resourceType: 'Bundle', type: 'collection', entry },
      links,
    };
  }

  /**
   * Normalizes the identity-claim input to the list of claim paths to include,
   * or `null` when the Patient must be omitted entirely.
   */
  private resolveIdentityClaims(input: IdentityClaimInput): string[] | null {
    if (input === false) return null;
    if (input === true || input === undefined) return DEFAULT_IDENTITY_CLAIMS;
    if (Array.isArray(input)) {
      return input.length > 0 ? input : DEFAULT_IDENTITY_CLAIMS;
    }
    return DEFAULT_IDENTITY_CLAIMS;
  }

  private createPatientWithIdentityClaims(
    patient: FHIRResource,
    claims: string[]
  ): FHIRResource {
    const patientCopy: FHIRResource = { resourceType: 'Patient' };

    for (const claim of claims) {
      const field = claim.startsWith('Patient.') ? claim.slice('Patient.'.length) : claim;

      if (field === 'name' && Array.isArray(patient.name)) {
        // Keep only family + given, drop use/text/period per data minimization.
        patientCopy.name = patient.name.map((name: any) => ({
          family: name.family,
          given: name.given,
        }));
      } else if (patient[field] !== undefined) {
        patientCopy[field] = patient[field];
      }
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
        // Mandatory removals: Resource.id and any *.text (DomainResource.text,
        // CodeableConcept.text).
        if (key === 'id' || key === 'text') {
          continue;
        }

        // meta: keep only .meta.security if present, drop everything else.
        if (key === 'meta') {
          if (value && typeof value === 'object' && (value as any).security) {
            sanitized[key] = { security: (value as any).security };
          }
          continue;
        }

        // Coding.display — drop when this object looks like a Coding.
        if (key === 'display' && (obj.system || obj.code)) {
          continue;
        }

        sanitized[key] = this.deepSanitize(value);
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Rewrites every `Reference.reference` that targets a bundled resource to its
   * short `resource:N` URI. References to resources not in the bundle are left
   * untouched.
   */
  private rewriteReferences(obj: any, refMap: Map<string, string>): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.rewriteReferences(item, refMap));
    }

    if (typeof obj === 'object') {
      const out: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'reference' && typeof value === 'string') {
          // Rewrite refs to bundled resources; drop dangling references (a card
          // reference must be a resolvable resource:N URI).
          if (refMap.has(value)) out[key] = refMap.get(value);
        } else {
          out[key] = this.rewriteReferences(value, refMap);
        }
      }
      return out;
    }

    return obj;
  }

  private isEmpty(v: any): boolean {
    if (v === null || v === undefined || v === '') return true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return false; // numbers/booleans (incl. 0/false) are not empty
  }

  /** Recursively remove empty strings, arrays, and objects (invalid in a card). */
  private pruneEmpty(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(x => this.pruneEmpty(x)).filter(x => !this.isEmpty(x));
    }
    if (obj && typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        const pv = this.pruneEmpty(v);
        if (!this.isEmpty(pv)) out[k] = pv;
      }
      return out;
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
