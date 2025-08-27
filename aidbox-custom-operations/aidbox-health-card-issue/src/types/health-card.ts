
export interface HealthCardPayload {
  iss: string; // Issuer URL
  nbf: number; // Not before timestamp
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
    resource: FHIRResource;
  }>;
}

export interface FHIRResource {
  resourceType: string;
  id?: string;
  [key: string]: any;
}


