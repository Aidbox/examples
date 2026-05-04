# US Core Profiles in TypeScript with @atomic-ehr/codegen

A small CSV-to-FHIR converter demonstrating [`@atomic-ehr/codegen`](https://github.com/atomic-ehr/codegen) profile class generation for US Core. Companion to the blog post [@atomic-ehr/codegen: US Core Profiles in TypeScript](https://www.health-samurai.io/articles/atomic-ehr-codegen-typescript-us-core-profiles).

The example:

1. generates profile classes for [US Core Patient](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html) and [US Core Blood Pressure](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-blood-pressure.html) plus base `Bundle` from `hl7.fhir.r4.core`,
2. loads `patients.csv` (5 rows: MRN, name, demographics, race, one BP reading each),
3. converts each row into a validated `USCorePatientProfile` + `USCoreBloodPressureProfile`,
4. packages them as a `Bundle<Patient | Observation>` transaction with `urn:uuid` cross-references,
5. reads `bundle.json` back, filters with `USCoreBloodPressureProfile.is`, and prints the average BP.

## Files

| File | Purpose |
|------|---------|
| `generate.ts` | Runs `@atomic-ehr/codegen` to produce typed profile classes in `fhir-types/` |
| `fhir-types/` | Generated output (committed so you can browse without running the generator) |
| `patients.csv` | Sample input (5 rows) |
| `load.ts` | Parses CSV, builds the typed Bundle, writes `bundle.json` |
| `avg.ts` | Reads `bundle.json` back, filters with `is()`, computes average BP |

## Run It

```bash
npm install
npx tsx generate.ts          # regenerate fhir-types/ (optional -- already committed)
npx tsx load.ts              # reads patients.csv, writes bundle.json
npx tsx avg.ts               # reads bundle.json, prints the average BP
```

Expected output:

```
$ npx tsx load.ts
Loaded 5 rows
Wrote bundle with 10 entries

$ npx tsx avg.ts
Avg BP: 125.2/82.0 mmHg (n=5)
```

## POST to a FHIR Server (Optional)

Any FHIR-compliant server accepts the generated `bundle.json` at its root endpoint. To try it end-to-end, [run Aidbox in Docker](https://www.health-samurai.io/docs/aidbox/getting-started/run-aidbox-locally) in two minutes; the setup writes a `docker-compose.yaml` with a per-install `BOX_ROOT_CLIENT_SECRET`. Read it back with `awk` so the curl commands keep working when the secret rotates:

```bash
SECRET=$(awk '/BOX_ROOT_CLIENT_SECRET:/{print $2}' docker-compose.yaml)

curl -u "root:$SECRET" -X POST \
  -H "Content-Type: application/fhir+json" \
  -d @bundle.json http://localhost:8080/fhir
```

Aidbox resolves the `urn:uuid` references to concrete Patient IDs during the transaction commit -- check with:

```bash
curl -u "root:$SECRET" "http://localhost:8080/fhir/Patient?family=Lovelace"
curl -u "root:$SECRET" "http://localhost:8080/fhir/Observation?code=http://loinc.org|85354-9" \
  | jq '.entry[].resource.subject.reference'
```

## Notes on the Code

- **`Row` is all strings.** The parser doesn't narrow types; each converter (`rowToPatient`, `rowToBP`) casts or converts where needed (`gender as Patient["gender"]`, `Number(row.systolic)`).
- **Must-support base fields** (`gender`, `birthDate`) aren't profiled further by US Core, so the profile class doesn't emit `.setGender()`-style setters. We populate them directly on the base `Patient` literal in `rowToPatient`, then pass it to `USCorePatientProfile.apply()`. `validate()` warns if a must-support field is missing.
- **`Bundle<Patient | Observation>` propagation** narrows `entry[].resource` to that union at the type level. In `avg.ts` the runtime narrowing on top comes from `USCoreBloodPressureProfile.is` -- a non-throwing type guard that checks `resourceType` + `meta.profile.includes(canonicalUrl)`.
- **`urn:uuid` references work directly.** The generated `Reference.reference` is typed as a union covering every FHIR literal reference form (`Patient/${id}`, absolute `http://...`, `urn:uuid:...`, `urn:oid:...`, `#fragment`). Transaction Bundle placeholder UUIDs drop right in; the server rewrites them to real `Patient/<id>` on commit.
- **Generator warnings are pre-suppressed.** `generate.ts` passes `mkCodegenLogger({ suppressTags: ["#fieldTypeNotFound", "#duplicateSchema", "#duplicateCanonical", "#largeValueSet"] })` so the ~10k routine warnings collapse to a single summary line. `prettyReport(report)` prints the file/line counts at the end.
