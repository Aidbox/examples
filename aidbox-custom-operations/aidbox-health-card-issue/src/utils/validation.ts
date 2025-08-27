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
    return !isNaN(date.getTime()) && dateTime.includes('T');
  } catch {
    return false;
  }
}



interface ExtractedParameters {
  credentialType: string[];
  credentialValueSet?: string;
  includeIdentityClaim: boolean;
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

  const extracted = resource.parameter.reduce(
    (acc: ExtractedParameters, param: any) => {
      const value =
        param.valueString ?? param.valueBoolean ?? param.valueInstant;

      if (!value) return acc;

      switch (param.name) {
        case 'credentialType':
          acc.credentialType = acc.credentialType || [];
          acc.credentialType.push(value);
          break;
        case 'credentialValueSet':
          acc.credentialValueSet = value;
          break;
        case 'includeIdentityClaim':
          acc.includeIdentityClaim = value;
          break;
        case '_since':
          acc._since = value;
          break;
      }

      return acc;
    },
    {} as Partial<ExtractedParameters>
  );

  return {
    ...defaults,
    ...extracted,
    credentialType: extracted.credentialType?.length
      ? extracted.credentialType
      : defaults.credentialType,
  };
}

