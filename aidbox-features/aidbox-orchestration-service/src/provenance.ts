/**
 * Provenance resource creation for tracking data sources.
 * Creates single Provenance per operation that tracks:
 * - Target: merged bundle
 * - Agent: Orchestration Service
 * - Entities: source bundles with their respective agents
 */

import type { Provenance } from "./fhir-types/hl7-fhir-r4-core";

export interface SourceInfo {
  name: string;
  identifier: string;
  bundleId: string;
}

/**
 * Generate deterministic bundle ID based on source, NHS number, and date.
 * Ensures idempotent storage (same data = same ID = upsert).
 */
export function generateBundleId(
  source: "gp" | "hospital" | "merged",
  nhsNumber: string,
  date: string
): string {
  return `${source}-bundle-${nhsNumber}-${date}`;
}

/**
 * Create single Provenance for the orchestration operation.
 * - Targets the merged bundle
 * - Main agent is Orchestration Service
 * - Each source bundle is an entity with its own agent
 */
export function createProvenance(
  mergedBundleId: string,
  sources: SourceInfo[],
  nhsNumber: string,
  date: string
): Provenance {
  const now = new Date().toISOString();

  return {
    resourceType: "Provenance",
    id: `provenance-${nhsNumber}-${date}`,
    target: [
      { reference: `Bundle/${mergedBundleId}` },
    ] as unknown as Provenance["target"],
    recorded: now,
    agent: [
      {
        who: {
          display: "Orchestration Service",
          identifier: {
            system: "http://example.org/services",
            value: "orchestration",
          },
        },
      },
    ],
    entity: sources.map((source) => ({
      role: "source" as const,
      what: {
        reference: `Bundle/${source.bundleId}`,
      },
      agent: [
        {
          who: {
            display: source.name,
            identifier: {
              system: "http://example.org/sources",
              value: source.identifier,
            },
          },
        },
      ],
    })) as unknown as Provenance["entity"],
  };
}
