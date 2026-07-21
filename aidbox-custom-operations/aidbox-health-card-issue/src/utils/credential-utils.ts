/**
 * Supported credential types for the $health-cards-issue operation.
 *
 * Two styles are accepted:
 *  - generic HL7-IG form: FHIR Resource Types ("Immunization", "Observation")
 *  - VCI form:             "https://smarthealth.cards#covid19"
 */
export const COVID19_CREDENTIAL_TYPE = 'https://smarthealth.cards#covid19';

export const SUPPORTED_CREDENTIAL_TYPES = [
  'Immunization',
  'Observation',
  COVID19_CREDENTIAL_TYPE,
] as const;

export type SupportedCredentialType = (typeof SUPPORTED_CREDENTIAL_TYPES)[number];

/**
 * Validates if a single credential type is supported (case-insensitive for the
 * FHIR resource-type form; exact for the smarthealth.cards URI form).
 */
export function isValidCredentialType(type: string): boolean {
  if (type === COVID19_CREDENTIAL_TYPE) return true;
  const lower = type.toLowerCase();
  return SUPPORTED_CREDENTIAL_TYPES.some(
    t => t !== COVID19_CREDENTIAL_TYPE && t.toLowerCase() === lower
  );
}

/**
 * Validates if all credential types in an array are supported.
 */
export function validateCredentialTypes(credentialTypes: string[]): boolean {
  return credentialTypes.every(type => isValidCredentialType(type));
}

/**
 * Gets the list of supported credential types.
 */
export function getSupportedCredentialTypes(): readonly string[] {
  return SUPPORTED_CREDENTIAL_TYPES;
}
