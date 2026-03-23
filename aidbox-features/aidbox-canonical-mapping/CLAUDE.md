# CLAUDE.md

## Project Overview

This project demonstrates canonical mapping — translating proprietary Hospital Information System (HIS) data into FHIR R4 resources. It shows two architectural approaches:

1. **Pure Facade** (synchronous) — Redis-cached proxy that fetches from HIS API on demand
2. **Event-Driven** — RabbitMQ consumer that maps ADT events to FHIR and stores in Aidbox

## FHIR Type Generation

FHIR TypeScript types are generated using `@atomic-ehr/codegen`. The config is at `scripts/generate-types.ts` with tree-shaking for Patient, Encounter, Location, Bundle, and OperationOutcome.

Generated types are output to `src/fhir-types/hl7-fhir-r4-core/` — do not edit these files manually.

```ts
import type { Patient } from "./fhir-types/hl7-fhir-r4-core/Patient";
import type { Encounter, EncounterLocation } from "./fhir-types/hl7-fhir-r4-core/Encounter";
import type { Bundle, BundleEntry } from "./fhir-types/hl7-fhir-r4-core/Bundle";
```

To add a new resource type, add its StructureDefinition URL to the `treeShake` config and run `bun run generate-types`.

## Commands

| Command | Description |
|---------|-------------|
| `bun run generate-types` | Regenerate FHIR TypeScript types |
| `bun run typecheck` | TypeScript type check |
| `bun run dev` | Start facade with hot reload |
| `bun run start:consumer` | Start event consumer |
| `bun run publish:admit` | Publish 7 test admit events |
| `docker compose --profile facade up -d --build` | Run facade approach |
| `docker compose --profile event-driven up -d --build` | Run event-driven approach |

## Project Structure

- `src/facade/index.ts` — FHIR facade HTTP server (Bun.serve)
- `src/facade/cache.ts` — Redis TTL cache
- `src/facade/his-server.ts` — Sample HIS API server
- `src/event-driven/consumer.ts` — RabbitMQ ADT event consumer
- `src/event-driven/publisher.ts` — ADT event simulator
- `src/event-driven/fhir-client.ts` — Aidbox FHIR client
- `src/shared/his-client.ts` — HIS API client (OAuth 2.0)
- `src/shared/fhir-mapper.ts` — HIS → FHIR R4 mapping functions
- `src/shared/test-data.ts` — Shared test data (7 sample patients)
- `src/fhir-types/` — Auto-generated FHIR types (do not edit)
- `scripts/generate-types.ts` — Codegen configuration
