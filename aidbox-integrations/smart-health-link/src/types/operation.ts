/**
 * Shape of the request Aidbox sends to an App endpoint when one of its
 * configured `operations` is triggered.
 */
export interface AidboxOperationRequest {
  type: string;
  operation: {
    id: string;
  };
  request: {
    // For POST operations, the parsed request body (e.g. a FHIR Parameters or the SHL manifest request body).
    resource?: unknown;
    // Path placeholders declared in App.operations[].path, e.g. { shlId } or { fileId }.
    'route-params': Record<string, string>;
    // Query string params.
    params?: Record<string, string>;
    headers: Record<string, string>;
  };
}

/** Body of a SMART Health Links manifest request (POST to the manifest URL). */
export interface ManifestRequestBody {
  recipient: string;
  passcode?: string;
  embeddedLengthMax?: number;
}
