import * as fs from 'fs';
import { SignJWT, importPKCS8 } from 'jose';
import { HealthCardPayload, FHIRBundle } from '../types/health-card';

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

    // Determine the credential type for VC
    const vcType = this.getCredentialType(credentialTypes);

    // Create the verifiable credential payload
    const payload: HealthCardPayload = {
      iss: this.issuer,
      nbf: Math.floor(Date.now() / 1000), // Current timestamp
      vc: {
        type: ['https://smarthealth.cards#health-card', vcType],
        credentialSubject: {
          fhirVersion: '4.0.1',
          fhirBundle: bundle,
        },
      },
    };

    // Sign the payload using JWS
    const jws = await new SignJWT(payload)
      .setProtectedHeader({
        alg: 'ES256',
        zip: 'DEF',
        kid: this.keyId, // Use consistent key identifier
      })
      .sign(this.privateKey);

    return jws;
  }

  private getCredentialType(credentialTypes: string[]): string {
    // Map FHIR resource types to SMART Health Cards credential types
    if (credentialTypes.includes('Immunization')) {
      return 'https://smarthealth.cards#immunization';
    } else if (credentialTypes.includes('Observation')) {
      return 'https://smarthealth.cards#laboratory';
    } else {
      return 'https://smarthealth.cards#health-card';
    }
  }
}
