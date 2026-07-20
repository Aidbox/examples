---
features: [FHIR Measure/$evaluate-measure, SQL on FHIR, Quality measures, HEDIS, eCQM, MeasureReport, Custom operations, Care gaps]
languages: [Python, SQL]
---
# Aidbox Measure/$evaluate-measure via SQL

FHIR R4 [Measure/$evaluate-measure](https://hl7.org/fhir/R4/operation-measure-evaluate-measure.html) implemented as native PostgreSQL SQL on Aidbox. No CQL engine required.

FHIR R4: canonical operation name `$evaluate-measure`, `reportType` values `subject | subject-list | population`.

Includes 12 CMS quality measures with sample data (484 test patients) and an interactive demo app.

## Stack

| Component | Version |
|---|---|
| Aidbox | **2603 recommended** (minimum 2508 — needed for `ViewDefinition`/`$materialize`) |
| Python / Flask | 3.11 / 3.x |
| PostgreSQL | 17 (via aidboxdb) |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- [Python 3](https://www.python.org/downloads/) (for the setup script)
- [curl](https://curl.se/) (optional, for manual API calls)

## Quick Start

### 1. Build the FHIR package

The measure *definitions* — terminology (CodeSystems + ValueSets), the SQL-on-FHIR
ViewDefinitions, and the SQLQuery Libraries — ship as one FHIR NPM package that Aidbox
installs at boot. Build it first:

```bash
python3 scripts/build_fhir_package.py    # -> dist/fhir-package/healthsamurai.measure-evaluate-0.1.0.tgz
```

`dist/` is gitignored (the `.tgz` is generated; the source resources under
`viewdefinitions/`, `sqlquery/`, and `data/` are tracked). `docker-compose.yml` mounts
`dist/fhir-package/` and `init.json` installs the package via a `$fhir-package-install`
entry at boot.

### 2. Start the stack

```bash
docker compose up --build
```

Three containers: PostgreSQL, Aidbox (port `8888`), and the SQL evaluate app (port
`8090`). On boot the init bundle installs the FHIR package (definitions) and registers
the `Measure/$evaluate-measure` App route.

### 3. Activate Aidbox

Open http://localhost:8888 in your browser and follow the activation prompt.

### 4. Load runtime state + data

In a second terminal, from this directory:

```bash
python3 setup.py --demo-patients
```

The package delivered the *definitions*; `setup.py` builds the runtime *state* they need:
it `$materialize`s the ViewDefinitions into `sof.*` tables (resolving the package's
canonical urls to runtime ids), populates the `concepts` table, creates wrapper views +
shared functions + indexes, and loads the 485 sample dqm-content patients (~2 min).

For an existing Aidbox with real patient data, omit `--demo-patients` to build only the
infrastructure without loading sample patients. See
[install-to-existing-aidbox.md](install-to-existing-aidbox.md).

### 5. Try Measure/$evaluate-measure

```bash
# Evaluate CMS130 for a single patient (R4 reportType "subject" = single patient)
curl -u root:secret -X POST \
  'http://localhost:8888/Measure/$evaluate-measure?measure=cms130&subject=Patient/007ec5f1-08cf-474a-a472-f6a92cca4b79&reportType=subject&periodStart=2026-01-01&periodEnd=2026-12-31'

# Summary report across all patients (R4 reportType "population")
curl -u root:secret -X POST \
  'http://localhost:8888/Measure/$evaluate-measure?measure=cms130&reportType=population&periodStart=2026-01-01&periodEnd=2026-12-31'
```

Response: FHIR MeasureReport with population counts (initial-population, denominator, exclusion, numerator) and measure score.

### 6. Open the demo app

Start a local HTTP server from this directory:

```bash
python3 -m http.server 3000
```

Then open the demo in your browser:

→ [http://localhost:3000/demo/app.html](http://localhost:3000/demo/app.html)

The demo has four tabs:

| Tab | What it shows |
|---|---|
| **Overview** | Measure cards with population breakdown and score |
| **Worklist** | Patients ranked by number of open gaps across all measures |
| **Patient 360** | Per-patient cross-measure status with evidence drill-down |
| **Cohort Actions** | Per-measure outreach lists with CSV export |

The demo is built for cohorts of tens of thousands of patients. Cross-measure aggregation runs on the server (`JSON_AGG` of open patient ids inside `summary_sql`), every patient-level tab is paginated 50 rows per page, and patient names are fetched lazily for the visible rows only.

## Demo Configuration

`demo/app.html` reads `demo/config.json` by default. Recognized keys:

| Key | Description |
|---|---|
| `aidbox_url` | Aidbox base URL (e.g., `http://localhost:8888`) |
| `auth_user`, `auth_pass` | Basic auth credentials |
| `dataset_label` | Label shown in the topbar |
| `period_start`, `period_end` | Measurement period defaults |
| `measures` | Optional whitelist of measure IDs to display (e.g., `["cms130", "cms131"]`). If omitted, all measures from `measure-sql.json` are shown. |

### Connecting to an existing Aidbox

For clients who already run Aidbox and want to install only the Flask app + measure resources, use a stack-specific config:

```bash
cp demo/config-external.example.json demo/config-external.json
# Edit demo/config-external.json with your Aidbox URL, credentials and active measures
```

Then open the demo with the `stack` URL parameter:

→ http://localhost:3000/demo/app.html?stack=external

The `?stack=NAME` parameter loads `demo/config-NAME.json` instead of the default `demo/config.json`, so multiple environments can coexist side-by-side.

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

`demo/config.json` ships with nine of these enabled by default; edit the `measures` array to add or remove any.

## How It Works

```
Client → POST /Measure/$evaluate-measure?measure=cms130&subject=Patient/123&reportType=subject
    → Aidbox (custom operation routing via App resource)
        → Flask app (port 8090)
            → resolves the measure's SQLQuery Library by canonical url
            → runs it via the SQL-on-FHIR $sqlquery-run operation
            → builds FHIR MeasureReport from the returned rows
        ← MeasureReport response
    ← returned to client
```

The measure calculation SQL lives entirely in Aidbox as SQL-on-FHIR **SQLQuery Library**
resources (installed from the FHIR package). The Flask app holds no measure SQL — it
invokes the Libraries via `$sqlquery-run` and shapes the rows into a MeasureReport. Each
Library declares `depends-on` lineage to the ViewDefinitions it reads.

Each measure's SQL (~200-400 lines, using the shared flat views + concepts table for
terminology matching) is authored in `sql/measures/<id>/` and packaged as SQLQuery
Library resources — `<id>-summary`, `<id>-per-patient`, and `<id>-evidence`.

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
