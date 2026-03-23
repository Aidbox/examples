---
name: generate-types
description: Generate or update FHIR TypeScript types using @atomic-ehr/codegen with tree-shaking
---

# FHIR Type Generation with @atomic-ehr/codegen

Generate type-safe FHIR R4 TypeScript interfaces from StructureDefinitions. Uses tree-shaking to only include the resource types you need.

## Setup (if not already configured)

### 1. Install the codegen package

```sh
# npm
npm install -D @atomic-ehr/codegen

# pnpm
pnpm add -D @atomic-ehr/codegen

# yarn
yarn add -D @atomic-ehr/codegen

# bun
bun add -d @atomic-ehr/codegen
```

For npm/pnpm/yarn projects, also install `tsx` to run the TypeScript generation script:

```sh
npm install -D tsx
```

### 2. Create the generation script

Create `scripts/generate-types.ts`:

```ts
import { APIBuilder, prettyReport } from "@atomic-ehr/codegen";

const builder = new APIBuilder()
  .throwException()
  .fromPackage("hl7.fhir.r4.core", "4.0.1")
  .typescript({
    withDebugComment: false,
    generateProfile: false,
    openResourceTypeSet: false,
  })
  .typeSchema({
    treeShake: {
      "hl7.fhir.r4.core": {
        // Add the resource types you need here.
        // All dependency types (Identifier, Reference, CodeableConcept, etc.)
        // are included automatically.
        "http://hl7.org/fhir/StructureDefinition/Patient": {},
        "http://hl7.org/fhir/StructureDefinition/Bundle": {},
        "http://hl7.org/fhir/StructureDefinition/OperationOutcome": {},
      },
    },
  })
  .outputTo("./src/fhir-types")
  .cleanOutput(true);

const report = await builder.generate();
console.log(prettyReport(report));
if (!report.success) process.exit(1);
```

### 3. Add the script to package.json

```json
{
  "scripts": {
    "generate-types": "bun run scripts/generate-types.ts"
  }
}
```

For npm/pnpm/yarn projects (using tsx instead of bun):

```json
{
  "scripts": {
    "generate-types": "tsx scripts/generate-types.ts"
  }
}
```

### 4. Add to .gitignore

```
.codegen-cache/
```

### 5. Include scripts in tsconfig.json

```json
{
  "include": ["src/**/*", "scripts/**/*"]
}
```

### 6. Run generation

```sh
# bun
bun run generate-types

# npm
npm run generate-types

# pnpm
pnpm run generate-types
```

This outputs typed interfaces to `src/fhir-types/hl7-fhir-r4-core/`. Commit these files — they are the project's FHIR type definitions.

## APIBuilder reference

### Loading FHIR packages

```ts
// FHIR R4 base (required)
.fromPackage("hl7.fhir.r4.core", "4.0.1")

// Implementation Guides (optional) — load from tgz URL
.fromPackageRef("https://fs.get-ig.org/-/hl7.fhir.us.core-7.0.0.tgz")
.fromPackageRef("https://fs.get-ig.org/-/fhir.r4.ukcore.stu2-2.0.2.tgz")
```

### TypeScript options

```ts
.typescript({
  withDebugComment: false,       // omit debug comments in generated files
  generateProfile: false,        // set true when loading IGs with constrained profiles
  openResourceTypeSet: false,    // stricter resource type unions
})
```

### Tree-shaking

Tree-shaking controls which resource types are generated. Without it, ALL FHIR resources are included (~150+ files). With it, only the listed types and their transitive dependencies are generated.

```ts
.typeSchema({
  treeShake: {
    "<package-name>": {
      "<StructureDefinition canonical URL>": {},
      // ...
    },
  },
})
```

**StructureDefinition URL patterns:**

| Source | Pattern | Example |
|--------|---------|---------|
| FHIR R4 base | `http://hl7.org/fhir/StructureDefinition/{ResourceType}` | `http://hl7.org/fhir/StructureDefinition/Patient` |
| US Core | `http://hl7.org/fhir/us/core/StructureDefinition/{profile}` | `http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient` |
| UK Core | `https://fhir.hl7.org.uk/StructureDefinition/{profile}` | `https://fhir.hl7.org.uk/StructureDefinition/UKCore-Patient` |

**Common FHIR R4 resource types:**

```ts
"http://hl7.org/fhir/StructureDefinition/Patient": {},
"http://hl7.org/fhir/StructureDefinition/Encounter": {},
"http://hl7.org/fhir/StructureDefinition/Observation": {},
"http://hl7.org/fhir/StructureDefinition/Condition": {},
"http://hl7.org/fhir/StructureDefinition/Procedure": {},
"http://hl7.org/fhir/StructureDefinition/MedicationRequest": {},
"http://hl7.org/fhir/StructureDefinition/DiagnosticReport": {},
"http://hl7.org/fhir/StructureDefinition/AllergyIntolerance": {},
"http://hl7.org/fhir/StructureDefinition/Immunization": {},
"http://hl7.org/fhir/StructureDefinition/Location": {},
"http://hl7.org/fhir/StructureDefinition/Organization": {},
"http://hl7.org/fhir/StructureDefinition/Practitioner": {},
"http://hl7.org/fhir/StructureDefinition/Bundle": {},
"http://hl7.org/fhir/StructureDefinition/OperationOutcome": {},
"http://hl7.org/fhir/StructureDefinition/Questionnaire": {},
"http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse": {},
```

### Output options

```ts
.outputTo("./src/fhir-types")   // output directory
.cleanOutput(true)               // delete output dir before regenerating
```

## Example: Adding an Implementation Guide

To generate US Core profiled types alongside base R4:

```ts
import { APIBuilder, prettyReport } from "@atomic-ehr/codegen";

const builder = new APIBuilder()
  .throwException()
  .fromPackage("hl7.fhir.r4.core", "4.0.1")
  .fromPackageRef("https://fs.get-ig.org/-/hl7.fhir.us.core-7.0.0.tgz")
  .typescript({
    withDebugComment: false,
    generateProfile: true,        // enable for IG profiles
    openResourceTypeSet: false,
  })
  .typeSchema({
    treeShake: {
      "hl7.fhir.r4.core": {
        "http://hl7.org/fhir/StructureDefinition/Bundle": {},
        "http://hl7.org/fhir/StructureDefinition/OperationOutcome": {},
      },
      "hl7.fhir.us.core": {
        "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient": {},
        "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-encounter-diagnosis": {},
        "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab": {},
      },
    },
  })
  .outputTo("./src/fhir-types")
  .cleanOutput(true);

const report = await builder.generate();
console.log(prettyReport(report));
if (!report.success) process.exit(1);
```

## What gets generated

For each resource type, a `.ts` file is generated containing:

- **Main interface** — e.g., `Patient`, `Encounter`, `Bundle`
- **BackboneElement interfaces** — nested structures like `EncounterLocation`, `PatientContact`, `BundleEntry`
- **Type guard function** — e.g., `isPatient(resource)`, `isEncounter(resource)`
- **Re-exports** of dependency types (Identifier, Reference, CodeableConcept, etc.)
- **Barrel export** — `index.ts` re-exports everything for convenience

Generated types are fully typed with FHIR value set enums where applicable:

```ts
// Encounter.status is a union of valid FHIR values
status: ("planned" | "arrived" | "triaged" | "in-progress" | "onleave" | "finished" | "cancelled" | "entered-in-error" | "unknown");

// References are typed with target resource types
subject?: Reference<"Group" | "Patient">;
location: Reference<"Location">;
```

## Import patterns

```ts
// Direct file import (preferred — explicit about what you use)
import type { Patient } from "./fhir-types/hl7-fhir-r4-core/Patient";
import type { Encounter, EncounterLocation } from "./fhir-types/hl7-fhir-r4-core/Encounter";
import type { Bundle, BundleEntry } from "./fhir-types/hl7-fhir-r4-core/Bundle";
import type { Identifier } from "./fhir-types/hl7-fhir-r4-core/Identifier";
import type { Reference } from "./fhir-types/hl7-fhir-r4-core/Reference";

// Barrel import (convenient for grabbing many types)
import type { Patient, Encounter, Location, Bundle } from "./fhir-types/hl7-fhir-r4-core";

// Type guards (value imports, not type-only)
import { isPatient, isEncounter } from "./fhir-types/hl7-fhir-r4-core";
```

## Workflow for adding a new resource type

1. Edit `scripts/generate-types.ts` — add the StructureDefinition URL to `treeShake`
2. Run `npm run generate-types` (or `bun run generate-types`, `pnpm run generate-types`)
3. Import the new type in your code
4. Run typecheck to verify
5. Commit the updated `src/fhir-types/` directory
