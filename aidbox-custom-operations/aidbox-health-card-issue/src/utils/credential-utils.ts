/**
 * Supported credential types for SMART Health Cards
 * Centralized definition to ensure consistency across the application
 */
export const SUPPORTED_CREDENTIAL_TYPES = ['Immunization', 'Observation'] as const;

export type SupportedCredentialType = typeof SUPPORTED_CREDENTIAL_TYPES[number];

/**
 * Validates if a single credential type is supported
 */
export function isValidCredentialType(type: string): type is SupportedCredentialType {
  return SUPPORTED_CREDENTIAL_TYPES.includes(type as SupportedCredentialType);
}

/**
 * Validates if all credential types in an array are supported
 */
export function validateCredentialTypes(credentialTypes: string[]): boolean {
  return credentialTypes.every(type => isValidCredentialType(type));
}

/**
 * Gets the list of supported credential types
 */
export function getSupportedCredentialTypes(): readonly string[] {
  return SUPPORTED_CREDENTIAL_TYPES;
}