import { Config } from '../types/config';
import { FHIRBundle } from '../types/health-card';
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

export class HealthCardService {
  private crypto: CryptoUtils;
  private fhir: FHIRClient;
  private bundleBuilder: BundleBuilder;

  constructor(config: Config) {
    this.crypto = new CryptoUtils(
      config.healthCards.keyPath,
      config.healthCards.issuer,
      config.jwks.keyId
    );
    this.fhir = new FHIRClient(config);
    this.bundleBuilder = new BundleBuilder();
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
  ): Promise<string> {
    const patient = await this.fhir.getPatient(patientId);
    const resources = await this.fhir.getResourcesByType(
      patientId,
      credentialTypes,
      opts.since
    );
    const filtered = this.bundleBuilder.filterByValueSet(
      resources,
      opts.credentialValueSet
    );

    if (filtered.length === 0) {
      throw new NoResourcesError();
    }

    const bundle = this.bundleBuilder.createHealthCardBundle(
      patient,
      filtered,
      opts.includeIdentityClaim
    );

    return this.crypto.generateHealthCard(bundle, credentialTypes);
  }

  /** Sign a pre-built bundle (kept for direct/testing use). */
  async generateHealthCard(
    bundle: FHIRBundle,
    credentialTypes: string[]
  ): Promise<string> {
    return this.crypto.generateHealthCard(bundle, credentialTypes);
  }
}
