import { OperationRequest } from '../types/operation';
import { isValidCredentialType } from './credential-utils';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateOperationRequest(
  request: OperationRequest
): ValidationResult {
  if (!request) {
    return { isValid: false, error: 'Request body is required' };
  }

  if (!request.request) {
    return { isValid: false, error: 'Request object is required' };
  }

  if (!request.request['route-params'] || !request.request['route-params'].id) {
    return {
      isValid: false,
      error: 'Patient ID is required in route parameters',
    };
  }

  // Extract parameters from FHIR Parameters resource
  const params = extractParametersFromResource(request.request.resource);

  // Validate _since parameter if provided
  if (params._since && !isValidDateTimeString(params._since)) {
    return {
      isValid: false,
      error: 'Invalid _since parameter format. Expected ISO 8601 datetime.',
    };
  }

  // Validate credentialType parameter if provided
  if (params.credentialType && params.credentialType.length > 0) {
    for (const type of params.credentialType) {
      if (!isValidCredentialType(type)) {
        return { isValid: false, error: `Invalid credential type: ${type}` };
      }
    }
  }

  return { isValid: true };
}

function isValidDateTimeString(dateTime: string): boolean {
  try {
    const date = new Date(dateTime);
    // Accept FHIR date (YYYY-MM-DD) as well as full dateTime/instant.
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

export interface ExtractedParameters {
  credentialType: string[];
  credentialValueSet?: string;
  // Per the operation, includeIdentityClaim is a repeating string of claim
  // paths (e.g. "Patient.name"). A boolean is tolerated for backward compat.
  includeIdentityClaim: boolean | string[];
  _since?: string;
}

export function extractParametersFromResource(
  resource: any
): ExtractedParameters {
  const defaults: ExtractedParameters = {
    credentialType: ['Immunization'],
    includeIdentityClaim: true,
  };

  if (!resource?.parameter) {
    return defaults;
  }

  const credentialType: string[] = [];
  const identityClaims: string[] = [];
  let identityBoolean: boolean | undefined;
  let credentialValueSet: string | undefined;
  let since: string | undefined;

  for (const param of resource.parameter) {
    switch (param.name) {
      case 'credentialType': {
        // Spec type is uri; tolerate valueString for compatibility.
        const v = param.valueUri ?? param.valueString;
        if (v) credentialType.push(v);
        break;
      }
      case 'credentialValueSet': {
        const v = param.valueUri ?? param.valueString;
        if (v) credentialValueSet = v;
        break;
      }
      case 'includeIdentityClaim': {
        // Spec type is string (repeating claim paths). Tolerate boolean.
        if (typeof param.valueBoolean === 'boolean') {
          identityBoolean = param.valueBoolean;
        } else if (param.valueString) {
          identityClaims.push(param.valueString);
        }
        break;
      }
      case '_since': {
        // Spec type is dateTime; tolerate instant/string.
        const v = param.valueDateTime ?? param.valueInstant ?? param.valueString;
        if (v) since = v;
        break;
      }
    }
  }

  const includeIdentityClaim: boolean | string[] =
    identityClaims.length > 0
      ? identityClaims
      : identityBoolean !== undefined
        ? identityBoolean
        : defaults.includeIdentityClaim;

  return {
    credentialType: credentialType.length ? credentialType : defaults.credentialType,
    credentialValueSet,
    includeIdentityClaim,
    _since: since,
  };
}
