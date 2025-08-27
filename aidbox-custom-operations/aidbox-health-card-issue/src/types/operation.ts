export interface OperationRequest {
  type: string;
  operation: {
    id: string;
  };
  request: {
    resource: {
      resourceType: 'Parameters';
      parameter: Array<{
        name: string;
        valueString?: string;
        valueBoolean?: boolean;
        valueInstant?: string;
      }>;
    };
    'route-params': {
      id: string; // Patient ID
    };
    headers: Record<string, any>;
  };
}

export interface OperationResponse {
  resourceType: 'Parameters';
  parameter: Array<{
    name: string;
    valueString?: string;
    valueBoolean?: boolean;
  }>;
}

export interface HealthCardResponse extends OperationResponse {
  parameter: [
    {
      name: 'verifiableCredential';
      valueString: string; // JWS-signed health card
    },
  ];
}
