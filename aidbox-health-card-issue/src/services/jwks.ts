import * as fs from 'fs';
import { JWKS, JWKSConfig } from '../types/jwks';

export class JWKSService {
  private jwks: JWKS | null = null;
  private config: JWKSConfig;

  constructor(config: JWKSConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Read pre-generated JWK file
      const jwkPath = this.config.publicKeyPath.replace('.pem', '.jwk.json');
      const jwkData = fs.readFileSync(jwkPath, 'utf8');
      const jwk = JSON.parse(jwkData);

      this.jwks = {
        keys: [jwk],
      };

      // eslint-disable-next-line no-console
      console.log(`JWKS initialized with key ID: ${jwk.kid}`);
    } catch (error) {
      throw new Error(`Failed to initialize JWKS: ${error}`);
    }
  }


  getJWKS(): JWKS {
    if (!this.jwks) {
      throw new Error('JWKS not initialized. Call initialize() first.');
    }
    return this.jwks;
  }


}
