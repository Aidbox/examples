---
features: [FHIR Measure/$evaluate-measure, SQL on FHIR, Quality measures, HEDIS, eCQM, MeasureReport, Custom operations, Care gaps]
languages: [Python, SQL]
---
# Aidbox Measure/$evaluate-measure via SQL

FHIR R4 [Measure/$evaluate-measure](https://hl7.org/fhir/R4/operation-measure-evaluate-measure.html) implemented as native PostgreSQL SQL on Aidbox. No CQL engine required.

FHIR R4 only: canonical operation name `$evaluate-measure`, `reportType` values `subject | subject-list | population`.

Includes 12 CMS quality measures with sample data (484 test patients) and an interactive demo app.

## Stack

| Component | Version |
|---|---|
| Aidbox | edge |
| Python / Flask | 3.11 / 3.x |
| PostgreSQL | 17 (via aidboxdb) |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- [Python 3](https://www.python.org/downloads/) (for the setup script)
- [curl](https://curl.se/) (optional, for manual API calls)

## Quick Start

### 1. Start the stack

```bash
docker compose up --build
```

This starts three containers: PostgreSQL, Aidbox (port `8888`), and the SQL evaluate app (port `8090`).

### 2. Activate Aidbox

Open http://localhost:8888 in your browser and follow the activation prompt.

### 3. Load data

In a second terminal, from this directory:

```bash
python3 setup.py
```

This creates shared views, loads terminology and clinical data for all 12 measures (~2 min).

### 4. Try Measure/$evaluate-measure

```bash
# Evaluate CMS130 for a single patient (R4 reportType "subject" = single patient)
curl -u root:secret -X POST \
  'http://localhost:8888/Measure/$evaluate-measure?measure=cms130&subject=Patient/007ec5f1-08cf-474a-a472-f6a92cca4b79&reportType=subject&periodStart=2026-01-01&periodEnd=2026-12-31'

# Summary report across all patients (R4 reportType "population")
curl -u root:secret -X POST \
  'http://localhost:8888/Measure/$evaluate-measure?measure=cms130&reportType=population&periodStart=2026-01-01&periodEnd=2026-12-31'
```

Response: FHIR MeasureReport with population counts (initial-population, denominator, exclusion, numerator) and measure score.

### 5. Open the demo app

Start a local HTTP server from this directory (needed so the demo app can fetch SQL files — `file://` is blocked by CORS):

```bash
python3 -m http.server 3000
```

Then open the demo in your browser:

→ [http://localhost:3000/demo/app.html](http://localhost:3000/demo/app.html)

The demo shows all 12 measures with patient-level care gaps, decision chains, and measure scores.

## Included Measures

| Measure | Name | Patients |
|---|---|---|
| CMS130 | Colorectal Cancer Screening | 64 |
| CMS125 | Breast Cancer Screening | 66 |
| CMS131 | Diabetes Eye Exam | 63 |
| CMS165 | Controlling High Blood Pressure | 68 |
| CMS124 | Cervical Cancer Screening | 34 |
| CMS139 | Fall Risk Screening | 29 |
| CMS75 | Children Dental Decay | 20 |
| CMS1154 | Screening for Prediabetes | 10 |
| CMS149 | Dementia Cognitive Assessment | 33 |
| CMS153 | Chlamydia Screening | 32 |
| CMS155 | Weight Assessment / Counseling | 34 |
| CMS143 | POAG Optic Nerve Evaluation | 32 |

## How It Works

```
Client → POST /Measure/$evaluate-measure?measure=cms130&subject=Patient/123&reportType=subject
    → Aidbox (custom operation routing via App resource)
        → Flask app (port 8090)
            → reads measure SQL from file
            → executes on Aidbox PostgreSQL via $sql
            → builds FHIR MeasureReport from results
        ← MeasureReport response
    ← returned to client
```

Each measure is a single SQL file (~200-400 lines) using shared flat views and a concepts table for terminology matching.

## Architecture

```
Aidbox JSONB tables
    → 8 shared flat views (patient, encounter, condition, observation, ...)
    → concepts table (offline terminology from ValueSet expansions)
    → measure-specific CTEs (initial population, exclusions, numerator)
    → MeasureReport
```

## API Parameters

| Parameter | Required | Description |
|---|---|---|
| `measure` | yes | Measure ID (e.g., `cms130`) or canonical URL |
| `subject` | no | Patient reference (e.g., `Patient/123`). Omit for summary report. |
| `periodStart` | no | Measurement period start (default: `2026-01-01`) |
| `periodEnd` | no | Measurement period end (default: `2026-12-31`) |
| `reportType` | no | `subject` (single patient, default if `subject` provided), `subject-list`, or `population` (default if no subject) |

## Shutdown

Stop (data preserved):
```bash
docker compose down
```

Stop and delete all data:
```bash
docker compose down -v
```
