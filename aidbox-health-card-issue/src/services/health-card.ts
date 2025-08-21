import { Config } from '../types/config';
import { FHIRBundle } from '../types/health-card';
import { CryptoUtils } from '../utils/crypto';
import { validateCredentialTypes } from '../utils/credential-utils';

export class HealthCardService {
  private crypto: CryptoUtils;

  constructor(config: Config) {
    this.crypto = new CryptoUtils(
      config.healthCards.keyPath,
      config.healthCards.issuer,
      config.jwks.keyId
    );
  }

  async generateHealthCard(
    bundle: FHIRBundle,
    credentialTypes: string[]
  ): Promise<string> {
    try {
      const healthCard = await this.crypto.generateHealthCard(
        bundle,
        credentialTypes
      );
      return healthCard;
    } catch (error) {
      throw new Error(`Failed to generate health card: ${error}`);
    }
  }

  validateCredentialTypes(credentialTypes: string[]): boolean {
    return validateCredentialTypes(credentialTypes);
  }

}
