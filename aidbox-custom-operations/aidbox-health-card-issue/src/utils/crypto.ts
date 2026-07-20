import * as fs from 'fs';
import { deflateRawSync } from 'zlib';
import { CompactSign, importPKCS8 } from 'jose';
import { HealthCardPayload, FHIRBundle } from '../types/health-card';

const COVID19_TYPE = 'https://smarthealth.cards#covid19';

export class CryptoUtils {
  private privateKey: any;
  private issuer: string;
  private keyId: string;
  private keyLoaded: Promise<void>;

  constructor(keyPath: string, issuer: string, keyId: string) {
    this.issuer = issuer;
    this.keyId = keyId;
    this.keyLoaded = this.loadPrivateKey(keyPath);
  }

  private async loadPrivateKey(keyPath: string): Promise<void> {
    try {
      const keyData = fs.readFileSync(keyPath, 'utf8');
      this.privateKey = await importPKCS8(keyData, 'ES256');
    } catch (error) {
      throw new Error(`Failed to load private key from ${keyPath}: ${error}`);
    }
  }

  async generateHealthCard(
    bundle: FHIRBundle,
    credentialTypes: string[]
  ): Promise<string> {
    await this.keyLoaded;

    if (!this.privateKey) {
      throw new Error('Private key not loaded');
    }

    // Build the verifiable credential payload (SMART Health Cards §5)
    const payload: HealthCardPayload = {
      iss: this.issuer,
      nbf: Math.floor(Date.now() / 1000), // seconds since epoch
      vc: {
        type: this.buildVcTypes(credentialTypes),
        credentialSubject: {
          fhirVersion: '4.0.1',
          fhirBundle: bundle,
        },
      },
    };

    // The SMART Health Cards spec requires the JWS payload to be minified
    // (JSON.stringify omits optional whitespace) and DEFLATE-compressed (raw,
    // no zlib/gz header) BEFORE signing, with the header advertising zip:"DEF".
    // jose's SignJWT does NOT compress for JWS, so we compress explicitly and
    // sign the compressed bytes with CompactSign.
    // Max compression (level 9) keeps the card small so it fits a QR <= v22.
    const compressed = deflateRawSync(Buffer.from(JSON.stringify(payload), 'utf8'), {
      level: 9,
    });

    const jws = await new CompactSign(compressed)
      .setProtectedHeader({
        alg: 'ES256',
        zip: 'DEF',
        kid: this.keyId, // base64url SHA-256 JWK thumbprint (RFC 7638)
      })
      .sign(this.privateKey);

    return jws;
  }

  /**
   * Build the `vc.type` array. `https://smarthealth.cards#health-card` is always
   * present; more specific types are added when they apply (spec: "other types
   * SHOULD be included when they apply"). Supports both the generic FHIR
   * resource-type credentials (Immunization/Observation) and the #covid19 VCI type.
   */
  private buildVcTypes(credentialTypes: string[]): string[] {
    const types = new Set<string>(['https://smarthealth.cards#health-card']);

    const wantsCovid = credentialTypes.includes(COVID19_TYPE);
    const wantsImmunization = credentialTypes.some(
      t => t.toLowerCase() === 'immunization'
    );
    const wantsObservation = credentialTypes.some(
      t => t.toLowerCase() === 'observation'
    );

    if (wantsImmunization || wantsCovid) {
      types.add('https://smarthealth.cards#immunization');
    }
    if (wantsCovid) {
      types.add(COVID19_TYPE);
    }
    if (wantsObservation) {
      types.add('https://smarthealth.cards#laboratory');
    }

    return [...types];
  }
}
