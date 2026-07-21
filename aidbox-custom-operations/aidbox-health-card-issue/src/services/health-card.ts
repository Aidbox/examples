import { Config } from '../types/config';
import { FHIRBundle, FHIRResource } from '../types/health-card';
import { CryptoUtils } from '../utils/crypto';
import { FHIRClient } from './fhir-client';
import { BundleBuilder, IdentityClaimInput } from './bundle-builder';
import { validateCredentialTypes } from '../utils/credential-utils';

/**
 * Thrown when a patient has no resources matching the requested criteria, so
 * that callers can map it to a 404 (vs a 500 for unexpected failures).
 */
export class NoResourcesError extends Error {
  constructor(message = 'No resources found for the specified criteria') {
    super(message);
    this.name = 'NoResourcesError';
  }
}

export interface IssueOptions {
  since?: string;
  includeIdentityClaim?: IdentityClaimInput;
  credentialValueSet?: string;
}

/** Links a `resource:N` entry in the card to the live FHIR resource it came from. */
export interface ResourceLink {
  bundledResource: string; // "resource:N" inside the card's fhirBundle
  hostedResource: string; // absolute URL of the live FHIR resource
}

export interface IssueResult {
  jws: string;
  resourceLinks: ResourceLink[];
}

export class HealthCardService {
  private crypto: CryptoUtils;
  private fhir: FHIRClient;
  private bundleBuilder: BundleBuilder;
  private fhirBaseUrl: string;

  constructor(config: Config) {
    this.crypto = new CryptoUtils(
      config.healthCards.keyPath,
      config.healthCards.issuer,
      config.jwks.keyId
    );
    this.fhir = new FHIRClient(config);
    this.bundleBuilder = new BundleBuilder();
    this.fhirBaseUrl = config.healthCards.fhirBaseUrl;
  }

  validateCredentialTypes(credentialTypes: string[]): boolean {
    return validateCredentialTypes(credentialTypes);
  }

  listPatients(): Promise<Array<{ id: string; label: string }>> {
    return this.fhir.listPatients();
  }

  /**
   * Full issuance pipeline: fetch the patient + clinical resources, assemble the
   * minified FHIR Bundle, and sign it into a SMART Health Card (JWS). Shared by
   * the Aidbox operation handler, the demo route, QR, and file download.
   */
  async issueForPatient(
    patientId: string,
    credentialTypes: string[],
    opts: IssueOptions = {}
  ): Promise<IssueResult> {
    const patient = await this.fhir.getPatient(patientId);
    const resources = await this.fhir.getResourcesByType(
      patientId,
      credentialTypes,
      opts.since
    );
    const filtered = await this.filterByValueSet(
      resources,
      opts.credentialValueSet
    );

    if (filtered.length === 0) {
      throw new NoResourcesError();
    }

    const { bundle, links } = this.bundleBuilder.createHealthCardBundle(
      patient,
      filtered,
      opts.includeIdentityClaim
    );

    const jws = await this.crypto.generateHealthCard(bundle, credentialTypes);
    const resourceLinks = links.map(l => ({
      bundledResource: l.bundledResource,
      hostedResource: `${this.fhirBaseUrl}/${l.reference}`,
    }));

    return { jws, resourceLinks };
  }

  /**
   * Keep only resources whose code (Immunization.vaccineCode / Observation.code)
   * is a member of the given ValueSet, using Aidbox terminology. No-op when no
   * credentialValueSet is provided.
   */
  private async filterByValueSet(
    resources: FHIRResource[],
    valueSetUrl?: string
  ): Promise<FHIRResource[]> {
    if (!valueSetUrl) return resources;

    const kept: FHIRResource[] = [];
    for (const r of resources) {
      const codings = this.extractCodings(r);
      let inValueSet = false;
      for (const c of codings) {
        if (c.system && c.code && (await this.fhir.validateCode(valueSetUrl, c.system, c.code))) {
          inValueSet = true;
          break;
        }
      }
      if (inValueSet) kept.push(r);
    }
    return kept;
  }

  private extractCodings(resource: FHIRResource): Array<{ system?: string; code?: string }> {
    const cc = resource.vaccineCode || resource.code; // Immunization / Observation
    return Array.isArray(cc?.coding) ? cc.coding : [];
  }

  /** Sign a pre-built bundle (kept for direct/testing use). */
  async generateHealthCard(
    bundle: FHIRBundle,
    credentialTypes: string[]
  ): Promise<string> {
    return this.crypto.generateHealthCard(bundle, credentialTypes);
  }
}
