# CLAUDE.md

## Project Overview

This project is an example of a typescript application written in Bun using Aidbox FHIR Server as a backend. It serves an HTML dashboard via Elysia showing patients and their observations.

## Aidbox Client

The app uses `@health-samurai/aidbox-client` (alpha) to communicate with Aidbox. The client is configured in `src/aidbox.ts` with `BasicAuthProvider`.

All SDK methods return a `Result<Ok, Err>` — use `result.isOk()` / `result.isErr()` to handle responses:

```ts
import { aidbox } from "./aidbox";

// Read
const result = await aidbox.read<Patient>({ type: "Patient", id: "pt-1" });

// Search
const result = await aidbox.searchType({ type: "Patient", query: [["name", "Alice"], ["_count", "10"]] });

// Create / Update / Delete
await aidbox.create<Patient>({ type: "Patient", resource: { ... } });
await aidbox.update<Patient>({ type: "Patient", id: "pt-1", resource: { ... } });
await aidbox.delete<Patient>({ type: "Patient", id: "pt-1" });

// Transaction
await aidbox.transaction({ format: "application/fhir+json", bundle: { resourceType: "Bundle", type: "transaction", entry: [...] } });
```

## FHIR Type Generation

FHIR TypeScript types are generated using `@atomic-ehr/codegen` (dev dependency). The generation script is at `scripts/generate-types.ts` and uses the `APIBuilder` API with tree-shaking to only include needed resource types.

Generated types are output to `src/fhir-types/hl7-fhir-r4-core/` and should be imported from there:

```ts
import type { Patient } from "./fhir-types/hl7-fhir-r4-core/Patient";
import type { Observation } from "./fhir-types/hl7-fhir-r4-core/Observation";
import type { Bundle, BundleEntry } from "./fhir-types/hl7-fhir-r4-core/Bundle";
```

To add a new resource type, add its StructureDefinition URL to the `treeShake` config in `scripts/generate-types.ts` and re-run generation.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with hot reload (port 3000) |
| `bun run generate-types` | Regenerate FHIR TypeScript types |
| `bun run build:init-bundle` | Rebuild `init-bundle.json` from `fhir/definitions/` |
| `bun run seed` | Seed sample data (2 patients, 20 observations) |

## Project Structure

- `src/index.ts` — Elysia web server with routes
- `src/aidbox.ts` — AidboxClient instance
- `src/fhir-types/` — Auto-generated FHIR types (do not edit manually)
- `scripts/generate-types.ts` — Type generation config
- `scripts/build-init-bundle.ts` — Assembles init-bundle from definitions (sorted by filename)
- `scripts/seed.ts` — Seeds sample Patient and Observation data
- `fhir/definitions/` — FHIR resource definitions, ordered by numeric filename prefix
- `docker-compose.yaml` — Aidbox + PostgreSQL
