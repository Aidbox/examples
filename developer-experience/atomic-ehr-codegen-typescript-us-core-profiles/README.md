# US Core Profiles in TypeScript with @atomic-ehr/codegen

A small CSV-to-FHIR converter demonstrating [`@atomic-ehr/codegen`](https://github.com/atomic-ehr/codegen) profile class generation for US Core. Companion to the blog post [Tutorial: US Core Profiles in TypeScript with @atomic-ehr/codegen](https://www.health-samurai.io/articles/atomic-ehr-codegen-typescript-us-core-profiles).

The example:

1. generates profile classes for [US Core Patient](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html) and [US Core Blood Pressure](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-blood-pressure.html) plus base `Bundle` from `hl7.fhir.r4.core`,
2. loads `patients.csv` (5 rows: MRN, name, demographics, race, one BP reading each),
3. converts each row into a validated `USCorePatientProfile` + `USCoreBloodPressureProfile`,
4. packages them as a transaction `Bundle` with `urn:uuid` cross-references,
5. reads the bundle back with typed getters and prints the average BP.

## Files

| File | Purpose |
|------|---------|
| `generate.ts` | Runs `@atomic-ehr/codegen` to produce typed profile classes in `fhir-types/` |
| `fhir-types/` | Generated output (committed so you can browse without running the generator) |
| `patients.csv` | Sample input (5 rows) |
| `load.ts` | Parses CSV, builds the Bundle, computes avg BP from the bundle |

## Run It

```bash
npm install
npx tsx generate.ts          # regenerate fhir-types/ (optional -- already committed)
npx tsx load.ts              # reads patients.csv, writes bundle.json, prints avg BP
```

Expected output:

```
Loaded 5 rows
Wrote bundle with 10 entries
Avg BP: 125.2/82.0 mmHg (n=5)
```

## POST to a FHIR Server (Optional)

Any FHIR-compliant server accepts the generated `bundle.json` at its root endpoint. If you want to try it end-to-end, [run Aidbox in Docker](https://docs.aidbox.app/getting-started/run-aidbox/run-aidbox-locally) in two minutes and then:

```bash
curl -u root:secret -X POST \
  -H "Content-Type: application/fhir+json" \
  -d @bundle.json http://localhost:8080/fhir
```

Aidbox resolves the `urn:uuid` references to concrete Patient IDs during the transaction commit -- check with:

```bash
curl -u root:secret "http://localhost:8080/fhir/Patient?family=Lovelace"
curl -u root:secret "http://localhost:8080/fhir/Observation?code=http://loinc.org|85354-9" \
  | jq '.entry[].resource.subject.reference'
```

## Notes on the Code

- **`Row` is all strings.** The parser doesn't narrow types; each converter (`rowToPatient`, `rowToBP`) casts or converts where needed (`gender as Patient["gender"]`, `Number(row.systolic)`).
- **Must-support base fields** (`gender`, `birthDate`) are set via `Object.assign(patient.toResource(), ...)` because US Core doesn't profile them further, so the profile class doesn't emit setters for them.
- **`urn:uuid` references work directly.** The generated `Reference.reference` is typed as a union covering every FHIR literal reference form (`Patient/${id}`, absolute `http://...`, `urn:uuid:...`, `urn:oid:...`, `#fragment`). Transaction Bundle placeholder UUIDs drop right in; the server rewrites them to real `Patient/<id>` on commit.
- **Generator warnings** are noisy (duplicate schemas, missing fields in upstream packages). They don't block generation; the output is usable.
