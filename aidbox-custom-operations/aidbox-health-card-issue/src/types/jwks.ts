export interface JWK {
  kty: 'EC';
  use: 'sig';
  crv: 'P-256';
  kid: string;
  x: string;
  y: string;
  alg: 'ES256';
}

export interface JWKS {
  keys: JWK[];
}

export interface JWKSConfig {
  keyId: string;
  publicKeyPath: string;
  issuer: string;
}
