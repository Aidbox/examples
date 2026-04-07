# CLAUDE.md

## Project Overview

FHIR Orchestration Service POC implementing `$getstructuredrecord` (GP Connect). Fetches patient data from 2 FHIR sources (SMART Backend Services + Basic Auth), deduplicates via ConceptMap/$translate, stores with Provenance, and returns merged Bundle.

## FHIR Type Generation

FHIR TypeScript types are generated using `@atomic-ehr/codegen`. The config is at `scripts/generate-types.ts`.

Generated types are output to `src/fhir-types/` — do not edit these files manually.

```ts
import type { Patient, Bundle, Provenance } from "./fhir-types/hl7-fhir-r4-core";
import type { UKCoreAllergyIntolerance } from "./fhir-types/fhir-r4-ukcore-stu2/profiles/UkcoreAllergyIntolerance";
import { UKCorePatientProfile } from "./fhir-types/fhir-r4-ukcore-stu2/profiles";
```

To regenerate types: `bun run generate-types`.

## Commands

| Command | Description |
|---------|-------------|
| `bun run start` | Start orchestration service |
| `bun run typecheck` | TypeScript type check |
| `bun run generate-types` | Regenerate FHIR TypeScript types |
| `docker compose up -d --build` | Start all services |

## Project Structure

- `src/index.ts` — HTTP server (Bun.serve), routing, error handling
- `src/orchestration.ts` — Main orchestration flow (fetch, deduplicate, store)
- `src/deduplication.ts` — Per-resource deduplication logic (Patient merge, AllergyIntolerance code match, Observation time/value match)
- `src/provenance.ts` — Provenance resource creation for audit trail
- `src/fhir-clients.ts` — Auth providers (SMART + Basic), source fetching
- `src/fhir-types/` — Auto-generated FHIR types (do not edit)
- `scripts/generate-types.ts` — Codegen configuration
- `aidbox-config/init.json` — ConceptMap for LOINC->SNOMED CT translation
- `general-practice-config/init.json` — GP test data (SNOMED CT)
- `hospital-config/init.json` — Hospital test data (LOINC)
