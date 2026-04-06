/**
 * Main orchestration logic
 * Fetches from multiple sources, deduplicates, stores with provenance, returns merged bundle
 */

import type {
  Bundle,
  BundleEntry,
  Patient,
  AllergyIntolerance,
  Observation,
  Encounter,
  Provenance,
  Parameters,
  ParametersParameter,
} from "./fhir-types/hl7-fhir-r4-core";
import {
  type AuthProvider,
  type FhirSource,
  type SourceBundle,
  fetchPatientData,
} from "./fhir-clients";
import { deduplicateResources, getNhsNumber } from "./deduplication";
import {
  generateBundleId,
  createProvenance,
} from "./provenance";

const NHS_NUMBER_SYSTEM = "https://fhir.nhs.uk/Id/nhs-number";

// ============ Parameters Parsing ============

export function parseNhsNumberFromParameters(params: Parameters): string | null {
  const nhsParam = params.parameter?.find(
    (p: ParametersParameter) =>
      p.name === "patientNHSNumber" || p.name === "nhs-number"
  );

  if (!nhsParam) return null;

  // valueIdentifier format (preferred)
  if (nhsParam.valueIdentifier) {
    if (nhsParam.valueIdentifier.system === NHS_NUMBER_SYSTEM) {
      return nhsParam.valueIdentifier.value ?? null;
    }
    // Accept any identifier if system not specified
    return nhsParam.valueIdentifier.value ?? null;
  }

  // Simple valueString format
  if (nhsParam.valueString) {
    return nhsParam.valueString;
  }

  return null;
}

// ============ Store Bundle ============

async function storeBundle(
  mainFhirAuth: AuthProvider,
  bundle: Bundle,
  bundleId: string
): Promise<void> {
  const bundleWithId: Bundle = { ...bundle, id: bundleId };

  const response = await mainFhirAuth.fetch(
    `${mainFhirAuth.baseUrl}/fhir/Bundle/${bundleId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/fhir+json" },
      body: JSON.stringify(bundleWithId),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to store bundle ${bundleId}: ${error}`);
  }
}

/**
 * Store merged resources via transaction bundle.
 * This creates the actual resources on the server (not just a Bundle document).
 */
async function storeMergedResourcesAsTransaction(
  mainFhirAuth: AuthProvider,
  entries: BundleEntry[]
): Promise<void> {
  const transactionBundle: Bundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries.map((entry) => {
      const resource = entry.resource;
      if (!resource) return entry;

      return {
        resource,
        request: {
          method: "PUT" as const,
          url: `${resource.resourceType}/${resource.id}`,
        },
      };
    }),
  };

  const response = await mainFhirAuth.fetch(
    `${mainFhirAuth.baseUrl}/fhir`,
    {
      method: "POST",
      headers: { "Content-Type": "application/fhir+json" },
      body: JSON.stringify(transactionBundle),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to store merged resources: ${error}`);
  }
}

async function storeProvenance(
  mainFhirAuth: AuthProvider,
  provenance: Provenance
): Promise<void> {
  const response = await mainFhirAuth.fetch(
    `${mainFhirAuth.baseUrl}/fhir/Provenance/${provenance.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/fhir+json" },
      body: JSON.stringify(provenance),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to store provenance ${provenance.id}: ${error}`);
  }
}

// ============ Main Orchestration ============

export interface OrchestrationConfig {
  sources: FhirSource[];
  mainFhirAuth: AuthProvider;
}

export interface OrchestrationResult {
  success: boolean;
  bundle?: Bundle;
  error?: string;
  sourceResults?: {
    source: string;
    bundleId: string;
    provenanceId: string;
  }[];
}

export async function orchestrate(
  nhsNumber: string,
  config: OrchestrationConfig
): Promise<OrchestrationResult> {
  const { sources, mainFhirAuth } = config;

  try {
    // Generate date for deterministic IDs (YYYY-MM-DD)
    const date = new Date().toISOString().split("T")[0]!;

    // 1. Fetch from all sources in parallel
    console.log(`Fetching data for NHS Number: ${nhsNumber}`);
    const sourceResults = await Promise.all(
      sources.map((source) => fetchPatientData(source, nhsNumber))
    );

    // 2. Generate deterministic bundle IDs
    const gpBundleId = generateBundleId("gp", nhsNumber, date);
    const hospitalBundleId = generateBundleId("hospital", nhsNumber, date);
    const mergedBundleId = generateBundleId("merged", nhsNumber, date);

    // Map source names to bundle IDs
    const sourceBundleIds: Record<string, string> = {
      gp: gpBundleId,
      hospital: hospitalBundleId,
    };

    // 3. Store source bundles
    console.log("Storing source bundles...");
    await Promise.all(
      sourceResults.map((result) => {
        const bundleId = sourceBundleIds[result.source];
        if (!bundleId) {
          throw new Error(`Unknown source: ${result.source}`);
        }
        return storeBundle(mainFhirAuth, result.bundle, bundleId);
      })
    );

    // 4. Collect all resources for deduplication
    const patients: Patient[] = sourceResults
      .map((r) => r.patient)
      .filter((p): p is Patient => p !== null);

    const allergies: AllergyIntolerance[] = sourceResults.flatMap(
      (r) => r.allergies
    );

    const observations: Observation[] = sourceResults.flatMap(
      (r) => r.observations
    );

    const encounters: Encounter[] = sourceResults.flatMap((r) => r.encounters);

    // 5. Deduplicate
    console.log("Deduplicating resources...");
    const deduped = await deduplicateResources(
      { patients, allergies, observations, encounters },
      mainFhirAuth
    );

    // 6. Build merged bundle
    const entries: BundleEntry[] = [];

    if (deduped.patient) {
      entries.push({ resource: deduped.patient });
    }

    for (const allergy of deduped.allergies) {
      entries.push({ resource: allergy });
    }

    for (const observation of deduped.observations) {
      entries.push({ resource: observation });
    }

    for (const encounter of deduped.encounters) {
      entries.push({ resource: encounter });
    }

    // 7. Store merged resources via transaction (creates actual resources on server)
    console.log("Storing merged resources...");
    await storeMergedResourcesAsTransaction(mainFhirAuth, entries);

    // 8. Store merged bundle document (for audit/provenance)
    const mergedBundle: Bundle = {
      resourceType: "Bundle",
      id: mergedBundleId,
      type: "collection",
      entry: entries,
    };
    await storeBundle(mainFhirAuth, mergedBundle, mergedBundleId);

    // 9. Create and store Provenance
    const provenance = createProvenance(
      mergedBundleId,
      [
        { name: "General Practice", identifier: "gp", bundleId: gpBundleId },
        { name: "Hospital", identifier: "hospital", bundleId: hospitalBundleId },
      ],
      nhsNumber,
      date
    );

    await storeProvenance(mainFhirAuth, provenance);

    console.log(`Provenance created: Provenance/${provenance.id}`);

    // 10. Build response bundle (Provenance stored but not returned to client)
    const responseBundle: Bundle = {
      resourceType: "Bundle",
      id: mergedBundleId,
      meta: {
        profile: ["https://fhir.hl7.org.uk/StructureDefinition/UKCore-Bundle"],
      },
      type: "collection",
      entry: entries,
    };

    console.log(
      `Orchestration complete: ${patients.length} patients -> 1, ` +
        `${allergies.length} allergies -> ${deduped.allergies.length}, ` +
        `${observations.length} observations -> ${deduped.observations.length}, ` +
        `${encounters.length} encounters (no dedup)`
    );

    return {
      success: true,
      bundle: responseBundle,
      sourceResults: sourceResults.map((result) => ({
        source: result.source,
        bundleId: sourceBundleIds[result.source]!,
        provenanceId: provenance.id!,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Orchestration failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}
