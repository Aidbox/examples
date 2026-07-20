
export interface HealthCardPayload {
  iss: string; // Issuer URL
  nbf: number; // Not before (seconds since epoch)
  exp?: number; // Optional expiration (seconds since epoch)
  vc: {
    type: string[];
    credentialSubject: {
      fhirVersion: string;
      fhirBundle: FHIRBundle;
    };
  };
  [key: string]: any; // Index signature for JWTPayload compatibility
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'collection';
  entry: Array<{
    fullUrl?: string; // short resource-scheme URI, e.g. "resource:0"
    resource: FHIRResource;
  }>;
}

export interface FHIRResource {
  resourceType: string;
  id?: string;
  [key: string]: any;
}


