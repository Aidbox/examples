# US Core Profiles in Python with @atomic-ehr/codegen

A small CSV-to-FHIR converter demonstrating [`@atomic-ehr/codegen`](https://github.com/atomic-ehr/codegen) profile class generation for US Core. The Python counterpart of [atomic-ehr-codegen-typescript-us-core-profiles](../atomic-ehr-codegen-typescript-us-core-profiles), generated for **Pydantic** with the **[fhirpy](https://github.com/beda-software/fhirpy)** async client enabled (`fhirpyClient: true`).

The example:

1. generates profile classes for [US Core Patient](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html) and [US Core Blood Pressure](https://www.hl7.org/fhir/us/core/StructureDefinition-us-core-blood-pressure.html) plus base `Bundle` from `hl7.fhir.r4.core`,
2. loads `patients.csv` (5 rows: MRN, name, demographics, race, one BP reading each),
3. converts each row into a validated `UscorePatientProfile` + `UscoreBloodPressureProfile`,
4. packages them as a `Bundle[Patient | Observation]` transaction with `urn:uuid` cross-references,
5. reads `bundle.json` back, selects the US Core BP observations, and prints the average BP.

## Files

| File | Purpose |
|------|---------|
| `generate.ts` | Runs `@atomic-ehr/codegen` to produce typed profile classes in `fhir_types/` (Node step) |
| `fhir_types/` | Generated output (committed so you can browse without running the generator) |
| `patients.csv` | Sample input (5 rows) |
| `load.py` | Parses CSV, builds the typed Bundle, writes `bundle.json` |
| `avg.py` | Reads `bundle.json` back, selects US Core BP, computes average BP |
| `post.py` | Optional: POSTs the bundle to a FHIR server with fhirpy's async client |

## Run It

Code generation runs through the Node tool; the application code is pure Python.

```bash
npm install
npx tsx generate.ts                           # regenerate fhir_types/ (optional -- already committed)

python3 -m venv venv && source venv/bin/activate
pip install -r fhir_types/requirements.txt    # pydantic + fhirpy

python load.py                                # reads patients.csv, writes bundle.json
python avg.py                                 # reads bundle.json, prints the average BP
```

Expected output:

```
$ python load.py
Loaded 5 rows
Wrote bundle with 10 entries

$ python avg.py
Avg BP: 125.2/82.0 mmHg (n=5)
```

## POST to a FHIR Server with fhirpy (Optional)

Run [Aidbox](https://www.health-samurai.io/fhir-server) locally:

```bash
curl -JO https://aidbox.app/runme && docker compose up -d
```

Then POST `bundle.json` and read the stored observations back as typed resources:

```bash
export AIDBOX_SECRET=$(awk '/BOX_ROOT_CLIENT_SECRET:/{print $2}' docker-compose.yaml)
python post.py
```

`post.py` builds an `AsyncFHIRClient`, POSTs the transaction (Aidbox resolves the `urn:uuid` references on commit), then `client.resources(Observation).search(...).fetch()` returns the stored observations deserialized into the generated `Observation` class.

## Notes on the Code

- **The generator is a Node tool; the output is Python.** `generate.ts` runs once to emit `fhir_types/`. After that you only need Python + Pydantic (and fhirpy for `post.py`).
- **`fhirpyClient: true`** makes the generated resources extend `FhirpyBaseModel`: they expose `resourceType` at class level and serialize via `model_dump`, which is everything fhirpy's typed client needs to `create` / `search` / `fetch` them.
- **camelCase attributes (`fieldFormat: "camelCase"`).** Resource fields use the FHIR wire names (`resourceType`, `birthDate`, `effectiveDateTime`), so attribute names match the JSON. This is what lets `client.resources(Observation).search(...).fetch()` be statically typed: fhirpy's `ResourceProtocol` looks for a `resourceType` attribute, which only exists as a real attribute under camelCase. (The generator also supports `snake_case`, but then `resourceType` is injected only at runtime and fhirpy's typed client can't see it statically.) Profile **method** names stay snake_case (`set_systolic`, `set_race`, `from_resource`).
- **Must-support base fields** (`gender`, `birthDate`) aren't profiled further by US Core, so the profile class emits no `.set_gender()`-style setters. `load.py` sets them on the base `Patient`, then calls `UscorePatientProfile.apply()`. `validate()` warns if a must-support field is missing.
- **No `is()` type guard.** Unlike the TypeScript API, the Python classes don't ship a `.filter()`-style guard. `avg.py` selects BP observations by `resourceType` + `meta.profile`, then calls `from_resource()`.
