# Install into an existing Aidbox

Guide for deploying `Measure/$evaluate-measure` into an **already-running Aidbox** (not via the bundled `docker-compose.yml`). Use this when you have a production/staging Aidbox with your own FHIR data and want to add the custom operation and our 12 CMS quality measures on top.

## What gets installed vs what stays yours

| What we install | What stays yours |
|---|---|
| 1 Flask container (sql-evaluate-app, port 8090) | Aidbox instance (any version, any deploy) |
| 1 App resource in Aidbox (wires the operation) | PostgreSQL data (Patient, Encounter, Condition, …) |
| ~8 SQL views over your FHIR tables (read-only projections) | All clinical resources — we don't touch them |
| 1 `concepts` table (terminology: 104 ValueSets, ~9 650 codes) | Your authentication, auth policies, access control |
| ~17 btree indexes on `Patient`/`Encounter`/`Condition`/… JSONB paths used by the measures | Your existing custom operations, Apps |
| 12 measure SQL definitions (one file per measure) | Your data, schemas, and other indexes |

## Prerequisites

- **Aidbox** any recent build, FHIR R4
  - Storage: Aidbox JSONB (default). Measures read `resource->'subject'->>'id'` etc. HAPI/raw-FHIR JSON storage is **not** supported — see [Aidbox JSONB specifics](#aidbox-jsonb-specifics) below.
- **Your FHIR data** conforms (at least loosely) to [US Core 6.1](http://hl7.org/fhir/us/core/STU6.1/) / [QI-Core 6.0](http://hl7.org/fhir/us/qicore/STU6/). Specifically the measures expect:
  - `Patient` with `birthDate`, `gender`
  - `Encounter` with `status`, `class.code`, `period.start`, `type[0].coding[0].code`
  - `Condition` with `code.coding[0].{system, code}`, `onsetDateTime` or `onsetPeriod.start`, `clinicalStatus`
  - `Observation` with `code.coding[0].{system, code}`, `effectiveDateTime` or `effectivePeriod`, `value.*` (polymorphic)
  - `Procedure` with `code.coding[0].{system, code}`, `performed.dateTime` or `performed.Period.start`, `status`
  - `MedicationRequest`, `Immunization`, `AllergyIntolerance` (for selected measures)
- **Aidbox admin credentials** with `$sql` access, ability to create `App` resources
- **Docker** (or any Python 3.11 runtime) for the sql-evaluate-app container
- **Network:** Aidbox must be able to reach the sql-evaluate-app container on port 8090, and the app must reach Aidbox on its API port

## Step 1. Deploy the sql-evaluate-app container

The app is a small Flask service that receives `$evaluate-measure` calls from Aidbox, executes SQL, and returns a FHIR MeasureReport.

### Option A — Docker (build from included Dockerfile)

```bash
# From this directory
docker build -t sql-evaluate-app:local .

docker run -d --name sql-evaluate-app \
  --network <your-aidbox-network> \
  -p 8090:8090 \
  -e AIDBOX_URL=http://<your-aidbox-host>:<port> \
  -e AIDBOX_USER=<admin-user> \
  -e AIDBOX_PASS=<admin-password> \
  -e REPO_ROOT=/app \
  sql-evaluate-app:local
```

### Option B — bare Python

```bash
cd app/
pip install -r requirements.txt
AIDBOX_URL=https://aidbox.example.com \
AIDBOX_USER=root \
AIDBOX_PASS=secret \
REPO_ROOT=$(pwd)/.. \
python3 app.py
```

Verify the app is up:

```bash
docker logs sql-evaluate-app --tail 15
# → should show:
#   "Measures available: cms1154, cms124, cms125, cms130, ..."
#   "Running on http://0.0.0.0:8090"
```

The app only exposes `POST /` — that's the HTTP-RPC entry point Aidbox dispatches to. Direct calls to the Flask container with `GET` or any other path return 404/405 — Aidbox is the front door. Users invoke the operation via Aidbox at `Measure/$evaluate-measure` (registered in Step 2), and that endpoint supports both `POST` and `GET`.

## Step 2. Register the App resource in Aidbox

This tells Aidbox to route both `POST` and `GET` calls on `Measure/$evaluate-measure` to your sql-evaluate-app. The two are semantically distinct:

- **`POST`** runs the measure **and persists** the resulting `MeasureReport` in Aidbox (the `measure-evaluate` operation below).
- **`GET`** runs the measure and returns the report without persisting it (the `measure-evaluate-get` operation below) — useful for ad-hoc / read-only validation.

```bash
curl -u <admin>:<password> -X PUT \
  https://aidbox.example.com/App/com.sql.evaluate.app \
  -H 'Content-Type: application/json' \
  -d '{
    "resourceType": "App",
    "type": "app",
    "apiVersion": 1,
    "endpoint": {
      "url": "http://sql-evaluate-app:8090",
      "type": "http-rpc",
      "secret": "mysecret"
    },
    "operations": {
      "measure-evaluate": {
        "path": ["Measure", "$evaluate-measure"],
        "method": "POST"
      },
      "measure-evaluate-get": {
        "path": ["Measure", "$evaluate-measure"],
        "method": "GET"
      }
    }
  }'
```

Replace `http://sql-evaluate-app:8090` with however Aidbox reaches the app container (Docker service name, Kubernetes Service DNS, static IP, etc.).

Verify:

```bash
curl -u <admin>:<password> \
  https://aidbox.example.com/App/com.sql.evaluate.app
# → returns the App resource
```

## Step 3. Install shared SQL infra and terminology

One command loads all non-clinical artifacts into your Aidbox:
- Shared SQL views (8 flat projections over FHIR JSONB)
- `concepts` table schema + 104 ValueSets × 9 651 codes
- Shared exclusion helper functions
- **Performance indexes** (~17 btree indexes on JSONB paths used by the measures — without these, measure SQL at scale is 100–1000× slower due to sequential scans)
- CodeSystem bundle + 12 FHIR `Measure` / `Library` resources
- Stub `Organization`, `Practitioner`, `Device` resources referenced by measures

```bash
python3 setup.py \
  --base-url=https://aidbox.example.com \
  --skip-clinical
```

The `--skip-clinical` flag tells setup.py to **not** load the 485 sample dqm-content test patients. Your clinical data stays untouched.

Setup is idempotent — safe to re-run. Expected output ends with:

```
==================================================
  Setup complete!
  Patients: <your actual patient count>
  Concepts: 9651
  Measures: 12
==================================================
```

Verify:

```bash
# 8 shared views wrap your FHIR data
curl -u <admin>:<password> -X POST \
  https://aidbox.example.com/\$sql \
  -H 'Content-Type: application/json' \
  -d '["SELECT count(*) FROM patient_flat"]'
# → [{"count": <number equal to your Patient count>}]

# concepts loaded
curl -u <admin>:<password> -X POST \
  https://aidbox.example.com/\$sql \
  -H 'Content-Type: application/json' \
  -d '["SELECT COUNT(DISTINCT valueset_url) AS valuesets, COUNT(*) AS codes FROM concepts"]'
# → [{"valuesets": 104, "codes": 9651}]
```

Authentication: setup.py uses `root:secret` by default (matching our sample docker-compose). If your Aidbox uses different credentials, edit `USER`/`PASS` constants at the top of `setup.py`, or — for production — fork and parameterize.

**If you want to add more measures later**, you can load additional ValueSets by appending to `concepts` from your own VSAC extractions. Schema:

```
concepts (valueset_url, valueset_name, system, code, display)
```

## Step 4. Measure-specific SQL (already bundled)

Each measure is one SQL file under `sql/measures/<cmsXXX>/02-<cmsXXX>-measure.sql`. It defines CTEs (initial population, exclusions, numerator) over the shared views + concepts table.

These SQL files are loaded by the Flask app from `$REPO_ROOT/sql/measures/` **at request time** — nothing to install into PostgreSQL. The Dockerfile already bakes them into the image (Step 1, Option A). If you ran bare Python (Step 1, Option B), point `REPO_ROOT` at this directory.

## Step 5. Evaluate a measure against your data

Single-patient report (R4 `reportType=subject`), **persisted** in Aidbox via `POST`:

```bash
curl -u <admin>:<password> -X POST \
  'https://aidbox.example.com/Measure/$evaluate-measure?measure=cms130&subject=Patient/<your-patient-id>&reportType=subject&periodStart=2024-01-01&periodEnd=2024-12-31'
```

Same call but **read-only** via `GET` — the report is computed and returned but not stored:

```bash
curl -u <admin>:<password> -X GET \
  'https://aidbox.example.com/Measure/$evaluate-measure?measure=cms130&subject=Patient/<your-patient-id>&reportType=subject&periodStart=2024-01-01&periodEnd=2024-12-31'
```

Population-level report across all your patients (either `POST` or `GET` works the same way):

```bash
curl -u <admin>:<password> -X POST \
  'https://aidbox.example.com/Measure/$evaluate-measure?measure=cms130&reportType=population&periodStart=2024-01-01&periodEnd=2024-12-31'
```

Response: a FHIR `MeasureReport` with `group.population` counts (initial-population, denominator, denominator-exclusion, numerator) and `group.measureScore`.

## Step 6. (Optional) Demo UI pointed at your Aidbox

The bundled `demo/app.html` is a single-file dashboard that visualises all 12 measures + care gaps + patient drill-down. It reads its target Aidbox from a config file — so you can point it at your instance without editing code.

A template is provided at `demo/config-external.example.json`. Copy and edit it to match your Aidbox.

```bash
# 1. Create a config pointing at your Aidbox (pick any name — the stem becomes the URL param)
cp demo/config-external.example.json demo/config-myaidbox.json
# Edit demo/config-myaidbox.json: set aidbox_url, auth_user, auth_pass,
# period_start, period_end, dataset_label for your environment.

# 2. Serve the sample directory over HTTP
python3 -m http.server 3000

# 3. Open the demo with ?stack=myaidbox — the demo fetches ./config-myaidbox.json
open 'http://localhost:3000/demo/app.html?stack=myaidbox'
```

URL-param convention: `?stack=<name>` makes the demo fetch `./config-<name>.json`. No parameter → default `config.json` (the sample's bundled data). You can add multiple stacks (`?stack=uat`, `?stack=prod-readonly`) the same way.

**CORS:** the demo calls your Aidbox's `$sql` endpoint from a browser. Aidbox reflects `Origin` in `Access-Control-Allow-Origin` by default — works out of the box. If your Aidbox is behind a stricter proxy, allow the origin where you're serving the demo (e.g., `http://localhost:3000`).

## Aidbox JSONB specifics

Our views and measure SQL assume **Aidbox JSONB** storage, not raw HAPI/FHIR JSON. Key path differences:

```
FHIR JSON                                 Aidbox JSONB
----------------------------------------  ----------------------------------------
resource.subject.reference                resource->'subject'->>'id'
resource.performedDateTime                resource->'performed'->'dateTime'
resource.performedPeriod.start            resource->'performed'->'Period'->>'start'
resource.valueCodeableConcept             resource->'value'->'CodeableConcept'
resource.medicationCodeableConcept        resource->'medication'->'CodeableConcept'
```

If your Aidbox uses raw FHIR JSON storage (rare), you'll need to adapt the views. All 8 shared views are in one file (`sql/01-views.sql`) and are ~200 lines total.

## Troubleshooting

### `Measure/$evaluate-measure` returns 404

- Verify `App/com.sql.evaluate.app` exists: `GET /App/com.sql.evaluate.app`
- Check Aidbox logs for `:app-not-found` or `:operation-not-registered` errors
- Aidbox picks up new Apps on creation — no restart needed, but confirm operation is registered: `GET /fhir/metadata` and look for `measure-evaluate` under ValueSet operations

### `Measure/$evaluate-measure` returns 500

- Check sql-evaluate-app logs: `docker logs sql-evaluate-app`
- Most common cause: Step 3 (`python3 setup.py --skip-clinical`) didn't run or failed partway — re-run it (idempotent)
- Flask dev server can drop connections on rapid sequential requests — for production, replace with gunicorn/waitress

### MeasureReport shows `initial-population = 0`

Your data doesn't match the measure's IP criteria. Common causes:

- Encounters lack `class.code` or `type.coding.code` matching the measure's Office-Visit ValueSets
- Patient `birthDate` puts them outside the age range (e.g., CMS130 requires age 50–74 at period end)
- Conditions use ICD-9 codes but measures check SNOMED/ICD-10

Quickest debug: evaluate for one known-good patient (`?subject=Patient/<id>&reportType=subject`), then inspect the MeasureReport's `evaluatedResource` array — it lists exactly which resources contributed to each population, with references to your actual data.

### Concepts table is smaller than expected

Re-run `python3 setup.py --skip-clinical` — it's idempotent (`DELETE WHERE valueset_url = X` before INSERT per ValueSet).

### `$evaluate-measure` times out or is very slow on a large dataset

Most often: the **performance indexes are missing**. They are part of `sql/03-performance.sql`, executed automatically by `setup.py`. If you installed an earlier version of this sample (before indexes were bundled), you can apply them standalone without re-running the full setup:

```bash
# Set credentials once (avoid pasting them inline)
export AIDBOX_USER=<your-admin-user>
export AIDBOX_PASS=<your-admin-password>
export AIDBOX_URL=https://aidbox.example.com

# Inspect the file
cat sql/03-performance.sql

# Apply via Aidbox $sql (the whole file is sent in one transactional call)
python3 -c "
import json, os, urllib.request, base64
auth = base64.b64encode(f\"{os.environ['AIDBOX_USER']}:{os.environ['AIDBOX_PASS']}\".encode()).decode()
url = f\"{os.environ['AIDBOX_URL']}/\$sql\"
with open('sql/03-performance.sql') as f:
    body = json.dumps([f.read()]).encode()
req = urllib.request.Request(url, method='POST', data=body)
req.add_header('Authorization', f'Basic {auth}')
req.add_header('Content-Type', 'application/json')
urllib.request.urlopen(req, timeout=300)
print('OK')
"

# Or, if you have direct psql access:
PGPASSWORD="$AIDBOX_PASS" psql -h <host> -U "$AIDBOX_USER" -d <aidbox_db> -f sql/03-performance.sql
```

Verify the indexes landed:

```bash
curl -u "$AIDBOX_USER:$AIDBOX_PASS" -X POST \
  "$AIDBOX_URL/\$sql" \
  -H 'Content-Type: application/json' \
  -d '["SELECT count(*) AS index_count FROM pg_indexes WHERE indexname LIKE '"'"'ix_%'"'"'"]'
# → [{"index_count": 17}]   (or close to it)
```

The single most important index for single-patient queries is `ix_<resource>_subject` on `(resource->'subject'->>'id')` — without it, every patient-scoped query degrades to a full sequential scan of the resource table.

## Uninstall

Complete removal from your Aidbox:

```bash
# 1. Remove the App resource
curl -u <admin>:<password> -X DELETE \
  https://aidbox.example.com/App/com.sql.evaluate.app

# 2. Stop the Flask container
docker stop sql-evaluate-app && docker rm sql-evaluate-app

# 3. Drop views and concepts table (via Aidbox $sql or psql)
curl -u <admin>:<password> -X POST \
  https://aidbox.example.com/\$sql \
  -H 'Content-Type: application/json' \
  -d '[
    "DROP TABLE IF EXISTS concepts CASCADE;
     DROP VIEW IF EXISTS patient_flat CASCADE;
     DROP VIEW IF EXISTS encounter_flat CASCADE;
     DROP VIEW IF EXISTS condition_flat CASCADE;
     DROP VIEW IF EXISTS observation_flat CASCADE;
     DROP VIEW IF EXISTS procedure_flat CASCADE;
     DROP VIEW IF EXISTS medicationrequest_flat CASCADE;
     DROP VIEW IF EXISTS servicerequest_flat CASCADE;
     DROP VIEW IF EXISTS devicerequest_flat CASCADE;"
  ]'
```

Your clinical data is untouched — we never wrote to it.
