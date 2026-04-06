/**
 * FHIR Client Setup -- re-exports auth providers from aidbox-ts-sdk
 * and adds FHIR source fetching logic.
 */

export { SmartBackendServicesAuthProvider, BasicAuthProvider } from "@health-samurai/aidbox-client";

import type { SmartBackendServicesAuthProvider, BasicAuthProvider } from "@health-samurai/aidbox-client";

// Simplified AuthProvider type that works with actual implementations
export type AuthProvider = SmartBackendServicesAuthProvider | BasicAuthProvider;

/**
 * Import a PEM-encoded PKCS#8 private key as a CryptoKey for use with SMART Backend Services.
 */
export async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM headers and whitespace
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  // Decode base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  // Import as CryptoKey
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-384",
    },
    false,
    ["sign"]
  );
}
import type { Bundle, Patient, AllergyIntolerance, Encounter, Observation } from "./fhir-types/hl7-fhir-r4-core";

// ============ FHIR Client ============

export interface FhirSource {
  name: string;
  auth: AuthProvider;
}

export interface SourceBundle {
  source: string;
  bundle: Bundle;
  patient: Patient | null;
  allergies: AllergyIntolerance[];
  observations: Observation[];
  encounters: Encounter[];
}

export async function fetchPatientData(
  source: FhirSource,
  _nhsNumber: string
): Promise<SourceBundle> {
  const { name, auth } = source;
  const baseUrl = auth.baseUrl;

  // Fetch test bundle from external source
  const bundleUrl = `${baseUrl}/fhir/Bundle/test-bundle`;

  console.log(`[${name}] Fetching Bundle from ${bundleUrl}`);

  const response = await auth.fetch(bundleUrl);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[${name}] Failed to fetch bundle: ${response.status} - ${error}`);
  }

  const bundle = await response.json() as Bundle;

  // Extract resources from the bundle
  const entries = bundle.entry ?? [];

  const patient = entries
    .map(e => e.resource)
    .find((r): r is Patient => r?.resourceType === "Patient") ?? null;

  const allergies = entries
    .map(e => e.resource)
    .filter((r): r is AllergyIntolerance => r?.resourceType === "AllergyIntolerance");

  const observations = entries
    .map(e => e.resource)
    .filter((r): r is Observation => r?.resourceType === "Observation");

  const encounters = entries
    .map(e => e.resource)
    .filter((r): r is Encounter => r?.resourceType === "Encounter");

  console.log(`[${name}] Received: ${patient ? 1 : 0} Patient, ${allergies.length} Allergy, ${observations.length} Observation, ${encounters.length} Encounter`);

  return {
    source: name,
    bundle,
    patient,
    allergies,
    observations,
    encounters,
  };
}
