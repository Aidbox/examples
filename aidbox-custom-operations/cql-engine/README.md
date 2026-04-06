---
features: [CQL, Custom operations, Spring Boot, FHIR operations, Clinical decision support, Quality measures]
languages: [Java, Kotlin]
---
# Aidbox CQL Integration with Spring Boot

This Spring Boot application integrates the [cqframework CQL engine](https://github.com/cqframework/clinical_quality_language) with Aidbox and implements the [Library/$evaluate](https://build.fhir.org/ig/HL7/cql-ig/OperationDefinition-cql-library-evaluate.html) operation.

Includes sample data and CQL libraries for 4 CMS quality measures: CMS130, CMS125, CMS131, CMS165.

## Stack

| Component | Version |
|---|---|
| CQL engine | cqframework 4.5.0 (Kotlin Multiplatform) |
| HAPI FHIR | 8.8.0 |
| Spring Boot | 3.4.1 |
| Aidbox | edge |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- [curl](https://curl.se/)
## Quick Start

### 1. Start Aidbox and the CQL app

```
docker compose up --build
```

### 2. Activate Aidbox

Open http://localhost:8888 in your browser and activate the Aidbox instance.

### 3. Verify with the simple example

Create a sample patient:

```bash
curl -u root:secret -X POST http://localhost:8888/fhir/Patient \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Patient","gender":"male","name":[{"family":"Smith"}]}'
```

Evaluate the `example` CQL library:

```bash
curl -u root:secret -X POST http://localhost:8888/Library/example/\$evaluate
```

Expected response:
```json
{
  "resourceType": "Parameters",
  "parameters": [
    { "name": "MalePatients", "valueHumanName": { "family": "Smith" } }
  ]
}
```

## Running CMS Quality Measures

### 4. Load shared terminology (once)

```bash
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/codesystems-bundle.json
```

Create stub resources (required by test data references):

```bash
curl -u root:secret -X PUT http://localhost:8888/fhir/Organization/example \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Organization","id":"example","name":"Example Organization"}'

curl -u root:secret -X PUT http://localhost:8888/fhir/Practitioner/example \
  -H "Content-Type: application/json" \
  -d '{"resourceType":"Practitioner","id":"example","name":[{"family":"Example","given":["Practitioner"]}]}'
```

### 5. Load a measure and evaluate

**CMS130 — Colorectal Cancer Screening** (64 test patients):

```bash
# Load ValueSets and clinical data
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms130-valuesets.json
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms130-clinical-data.json

# Evaluate for a patient
curl -u root:secret -X POST \
  'http://localhost:8888/Library/CMS130FHIRColorectalCancerScrn/$evaluate?patientId=007ec5f1-08cf-474a-a472-f6a92cca4b79'
```

Expected response:
```json
{
  "resourceType": "Parameters",
  "parameters": [
    { "name": "Initial Population", "valueBoolean": true },
    { "name": "Denominator", "valueBoolean": true },
    { "name": "Denominator Exclusions", "valueBoolean": true },
    { "name": "Numerator", "valueBoolean": false }
  ]
}
```

**CMS125 — Breast Cancer Screening** (66 test patients):

```bash
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms125-valuesets.json
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms125-clinical-data.json

curl -u root:secret -X POST \
  'http://localhost:8888/Library/CMS125FHIRBreastCancerScreen/$evaluate?patientId=01c88972-84e2-4594-835b-924481b9990a'
```

**CMS131 — Diabetes Eye Exam** (63 test patients):

```bash
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms131-valuesets.json
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms131-clinical-data.json

curl -u root:secret -X POST \
  'http://localhost:8888/Library/CMS131FHIRDiabetesEyeExam/$evaluate?patientId=89073685-3807-41f5-bc32-2cf44c1b8227'
```

**CMS165 — Controlling High Blood Pressure** (68 test patients):

```bash
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms165-valuesets.json
curl -u root:secret -X POST http://localhost:8888/fhir \
  -H "Content-Type: application/json" -d @data/cms165-clinical-data.json

curl -u root:secret -X POST \
  'http://localhost:8888/Library/CMS165FHIRControllingHighBP/$evaluate?patientId=45e01fed-56bb-483d-a860-af3d566bda11'
```

## How It Works

```
Client → POST /Library/{name}/$evaluate?patientId={id}
    → Aidbox (custom operation routing via App resource)
        → Spring Boot CQL app (port 8080)
            → cqframework engine
                → reads CQL from classpath
                → retrieves FHIR data from Aidbox
                → expands ValueSets via Aidbox $expand
            ← FHIR Parameters response
        ← proxied back
    ← returned to client
```

## Adding Your Own CQL Library

1. Place `.cql` file in `src/main/resources/`
2. Rebuild: `docker compose build cql-app && docker compose up -d cql-app`
3. Evaluate: `POST /Library/{library-name}/$evaluate`

## Known Limitations

- **ToConcept(Quantity) bug** — measures using `USCoreBMIProfile` with value comparison fail with `Could not resolve call to operator 'ToConcept'`. This is an upstream cqframework issue ([#564](https://github.com/cqframework/clinical_quality_language/issues/564)).

## Aidbox-Specific Adaptations

These adaptations are needed because Aidbox handles terminology differently from HAPI FHIR server (the reference test environment for cqframework):

| What | Why |
|---|---|
| `FullExpandTerminologyWrapper` | Aidbox `$expand` may return incomplete results without explicit `count` parameter. Wrapper adds `count=10000`. |
| `maxCodesPerQuery=64` | Large ValueSets cause HTTP 414 (URI Too Long) when codes are inlined in search URLs |
| QICore data provider registration | CMS measures use QICore profiles. Engine looks up data by model URI — without registering `http://hl7.org/fhir/us/qicore`, it silently returns no data. |
| kotlinx-io bridge | CQL engine 4.x (Kotlin) uses `kotlinx.io.Source` instead of `java.io.InputStream` for loading CQL files. Bridge code converts between the two. |
| `buildResponse()` | CQL engine returns Java objects (`Map<String, ExpressionResult>`). This method serializes them into a FHIR Parameters JSON response. |
| `BOX_FHIR_TERMINOLOGY_ENGINE: hybrid` | Aidbox requires explicit terminology engine configuration for `$expand` |
| Stub `Organization/example` + `Practitioner/example` | Test data Coverage and MedicationRequest resources reference these |
| ValueSet `description` + `valueDate` fix | Aidbox requires `description` (FHIR says optional) and rejects `valueDate` extensions |

## Test Data Source

Clinical data and ValueSets come from [dqm-content-qicore-2025](https://github.com/cqframework/dqm-content-qicore-2025), the official test suite for CQL quality measures.
