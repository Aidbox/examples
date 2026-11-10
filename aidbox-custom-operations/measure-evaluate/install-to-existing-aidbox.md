# Install into an existing Aidbox

Guide for deploying `Measure/$evaluate-measure` into an **already-running Aidbox** (not via the bundled `docker-compose.yml`). Use this when you have a production/staging Aidbox with your own FHIR data and want to add the custom operation and our 12 CMS quality measures on top.

> **Just want to try the demo?** Use the [Quick Start in the README](README.md#quick-start) instead. It starts its own Aidbox with the measures and 485 sample patients already loaded, and you don't need an existing Aidbox.

## What gets installed vs what stays yours

| What we install | What stays yours |
|---|---|
| 1 FHIR package `healthsamurai.measure-evaluate` (CodeSystems, ValueSets, `ViewDefinition`s, SQLQuery `Library` resources holding each measure's SQL) | Aidbox instance (any version, any deploy) |
| 1 Flask container (sql-evaluate-app, port 8090) | PostgreSQL data (Patient, Encounter, Condition, …) |
| 1 App resource in Aidbox (wires the operation) | All clinical resources — we don't touch them |
| `sof.*_flat` tables materialized from the `ViewDefinition`s (the typed projection layer ships as `sql-view` Libraries, inlined by Aidbox at query time) | Your authentication, auth policies, access control |
| `sof.concept` / `concepts` terminology tables and btree indexes on `sof.*` | Your existing custom operations, Apps, schemas and other indexes |

## Prerequisites

- **Aidbox** any recent build, FHIR R4
  - Storage: Aidbox JSONB (default). The shipped `ViewDefinition` resources use FHIRPath against Aidbox JSONB; raw HAPI/FHIR JSON storage is not supported.
  - Version: **Aidbox 2603 recommended** (current stable). Minimum supported is 2508 (needed for the `$materialize` operation on `ViewDefinition`). Older versions are not supported.
- **Your FHIR data** conforms (at least loosely) to [US Core 6.1](http://hl7.org/fhir/us/core/STU6.1/) / [QI-Core 6.0](http://hl7.org/fhir/us/qicore/STU6/). The measures read these elements (multi-coding supported — all entries in `code.coding[]` are considered):
  - `Patient` with `birthDate`, `gender`, optional `us-core-sex` / `us-core-race` / `us-core-ethnicity` extensions
  - `Encounter` with `status`, `class.code`, `period.start`, `type.coding`
  - `Condition` with `code.coding`, `onsetDateTime` or `onsetPeriod.start`, `clinicalStatus`
  - `Observation` with `code.coding`, `effectiveDateTime` or `effectivePeriod`, `value.*` (polymorphic, including `valueCodeableConcept.coding`)
  - `Procedure` with `code.coding`, `performed.dateTime` or `performed.Period.start`, `status`
  - `MedicationRequest`, `ServiceRequest`, `DeviceRequest` (for selected measures)
- **Aidbox admin credentials** with `$sql` access, ability to create `App` resources
- **Python 3** to build the FHIR package
- **Ability to mount a directory into the Aidbox container** (Step 1 installs the package from a file Aidbox can read)
- **Docker** (or any Python 3.11 runtime) for the sql-evaluate-app container
- **Network:** Aidbox must be able to reach the sql-evaluate-app container on port 8090, and the app must reach Aidbox on its API port

## Step 1. Build and install the FHIR package

Everything non-clinical the measures need ships as one FHIR NPM package. Build it from this folder:

```bash
python3 scripts/build_fhir_package.py
# -> dist/fhir-package/healthsamurai.measure-evaluate-0.1.0.tgz
```

Aidbox installs a local package from a `file://` path **inside its own container**, so make the `.tgz` visible to Aidbox. For a Docker Compose deployment, add a read-only mount to your Aidbox service and restart it:

```yaml
services:
  aidbox:
    volumes:
      - /path/to/measure-evaluate/dist/fhir-package:/srv/aidbox-fhir-packages:ro
```

(Kubernetes: put the `.tgz` on a volume mounted at the same path.) Then install it:

```bash
curl -u <admin>:<password> -X POST \
  'https://aidbox.example.com/$fhir-package-install' \
  -H 'Content-Type: application/json' \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {"name": "package",
       "valueString": "file:///srv/aidbox-fhir-packages/healthsamurai.measure-evaluate-0.1.0.tgz"}
    ]
  }'
```

Package install re-keys `ViewDefinition` / `Library` ids to Aidbox-assigned GUIDs. The canonical `url`s are preserved, and everything in this sample resolves resources by `url`.

Verify:

```bash
curl -u <admin>:<password> \
  'https://aidbox.example.com/fhir/Library?url=https://health-samurai.io/fhir/Library/cms130-summary&_elements=url'
# -> a Bundle with one entry
```

## Step 2. Deploy the sql-evaluate-app container

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

The app only exposes `POST /` — that's the HTTP-RPC entry point Aidbox dispatches to. Direct calls to the Flask container with `GET` or any other path return 404/405 — Aidbox is the front door. Users invoke the operation via Aidbox at `Measure/$evaluate-measure` (registered in Step 3), and that endpoint supports both `POST` and `GET`.

## Step 3. Register the App resource in Aidbox

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

Replace `http://sql-evaluate-app:8090` with however Aidbox reaches the app container (Docker service name, Kubernetes Service DNS, static IP, etc.). With plain Docker, the simplest option is to start the app on Aidbox's network (`--network <your-aidbox-network>` in Step 2; find the name with `docker network ls`). Then `http://sql-evaluate-app:8090` works as written.

Verify:

```bash
curl -u <admin>:<password> \
  https://aidbox.example.com/App/com.sql.evaluate.app
# → returns the App resource
```

## Step 4. Build the runtime state

Everything non-clinical is delivered by the FHIR package you installed in Step 1:
the `ViewDefinition` resources, the SQLQuery `Library` resources holding each
measure's SQL, the typed `sql-view` wrapper layer, and the `setup-NN-*` scripts
for terminology scaffolding and `sof.*` indexes. The app applies them in
dependency order — nothing here is measure-specific, so this works the same for a
package of 12 measures or 200.

```bash
curl -s -X POST http://localhost:8090/api/materialize \
  -H 'Content-Type: application/json' -d '{}'
```

or press **Materialize all** in the demo app. It performs, in order:

1. `$materialize` each `ViewDefinition` into a `sof.*` table
2. run the package's `setup-NN-*` scripts (terminology scaffolding, indexes)
3. flatten `far.valueset` into `sof.concept` — the only step no package resource
   can express, since Aidbox keeps ValueSets in a registry the SoF engine cannot see

Idempotent and safe to re-run: views already present are skipped unless you pass
`{"force":true}`. Your clinical data is never touched.

Verify:

```bash
# materialized projection of your Patient data
curl -u <admin>:<password> -X POST \
  https://aidbox.example.com/\$sql \
  -H 'Content-Type: application/json' \
  -d '["SELECT count(*) FROM sof.patient_flat"]'
# → [{"count": <number equal to your Patient count>}]

# sof.*_flat materialized tables (one per ViewDefinition)
curl -u <admin>:<password> -X POST \
  https://aidbox.example.com/\$sql \
  -H 'Content-Type: application/json' \
  -d '["SELECT relname FROM pg_class WHERE relkind='"'"'r'"'"' AND relname LIKE '"'"'%_flat'"'"' ORDER BY relname"]'
# → 9 rows: condition_flat, devicerequest_flat, encounter_flat, medicationrequest_flat,
#   observation_bp_flat, observation_flat, patient_flat, procedure_flat, servicerequest_flat

# concepts loaded
curl -u <admin>:<password> -X POST \
  https://aidbox.example.com/\$sql \
  -H 'Content-Type: application/json' \
  -d '["SELECT COUNT(DISTINCT valueset_url) AS valuesets, COUNT(*) AS codes FROM concepts"]'
```

Authentication: the app reads `AIDBOX_URL`, `AIDBOX_USER` and `AIDBOX_PASS` from its environment (set them in `docker-compose.yml`); `load-demo-data.py` takes `--aidbox`, `--user` and `--password`.

**If you want to add more measures later**, you can load additional ValueSets by appending to `concepts` from your own VSAC extractions. Schema:

```
concepts (valueset_url, valueset_name, system, code, display)
```

## Step 5. (Optional) Load the sample patients

Only for a sandbox/staging Aidbox. Don't do this next to real data. It loads the same 485 test patients the Quick Start uses, then re-materializes:

```bash
python3 load-demo-data.py --aidbox https://aidbox.example.com \
  --user <admin> --password <password> \
  --app http://localhost:8090 --materialize
```

## Step 6. Evaluate a measure against your data

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

## Step 7. (Optional) Demo UI pointed at your Aidbox

The bundled `demo/app.html` is a single-file dashboard that visualizes all 12 measures + care gaps + patient drill-down. It reads its target Aidbox from a config file — so you can point it at your instance without editing code.

A template is provided at `demo/config-external.example.json`. Copy and edit it to match your Aidbox.

```bash
# 1. Create a config pointing at your Aidbox (pick any name — the stem becomes the URL param)
cp demo/config-external.example.json demo/config-myaidbox.json
# Edit demo/config-myaidbox.json: set aidbox_url, auth_user, auth_pass,
# period_start, period_end, dataset_label for your environment.

# 2. Serve the sample directory over HTTP.
#    (If you are running this repo's docker compose stack, skip this — the app
#    container already serves the demo on http://localhost:8090.)
python3 -m http.server 3000

# 3. Open the demo with ?stack=myaidbox — the demo fetches ./config-myaidbox.json
open 'http://localhost:3000/demo/app.html?stack=myaidbox'
```

URL-param convention: `?stack=<name>` makes the demo fetch `./config-<name>.json`. No parameter → default `config.json` (the sample's bundled data). You can add multiple stacks (`?stack=uat`, `?stack=prod-readonly`) the same way.

**CORS:** the demo calls your Aidbox's `$sql` endpoint from a browser. Aidbox reflects `Origin` in `Access-Control-Allow-Origin` by default — works out of the box. If your Aidbox is behind a stricter proxy, allow the origin where you're serving the demo (e.g., `http://localhost:3000`).

## Architecture notes

Measure SQL is built on top of two layers that hide most of the raw Aidbox JSONB:

1. **`ViewDefinition` resources** (in `viewdefinitions/`) use FHIRPath to project FHIR resources into relational columns. `POST /ViewDefinition/<id>/$materialize` writes the result into a `sof.*_flat` table.
2. **Typed projections** (`sql-view` Libraries, sources in `sqlview/`) sit on top of the `sof.*_flat` tables and add: `COALESCE` for polymorphic `dateTime` vs `Period`, `parse_fhir_datetime` for partial dates like `"2015"` / `"2015-10"`, and a `has_value::boolean` cast for Observation.

Measure SQL queries the typed projections — `encounter_flat`, `condition_flat`, etc. — using simple column names. Those projections are `sql-view` Libraries in the package, which Aidbox inlines as CTEs at query time rather than materializing as database views. Aidbox JSONB still underlies the raw resources, but the JSONB extraction is encapsulated in the `ViewDefinition` resources, not duplicated in every measure SQL. One wrapper (`medicationrequest_flat`) additionally `LEFT JOIN`s the raw `medication` table to fall back on medication-by-`Reference` cases that the `ViewDefinition` alone can't resolve.

## Troubleshooting

### `Measure/$evaluate-measure` returns 404

- Verify `App/com.sql.evaluate.app` exists: `GET /App/com.sql.evaluate.app`
- Check Aidbox logs for `:app-not-found` or `:operation-not-registered` errors
- Aidbox picks up new Apps on creation — no restart needed, but confirm operation is registered: `GET /fhir/metadata` and look for `measure-evaluate` under ValueSet operations

### `Measure/$evaluate-measure` returns 500

- Check sql-evaluate-app logs: `docker logs sql-evaluate-app`
- Most common cause: Step 4 didn't run or failed partway — re-run `curl -s -X POST http://localhost:8090/api/materialize -H 'Content-Type: application/json' -d '{"force":true}'` (idempotent)
- Flask dev server can drop connections on rapid sequential requests — for production, replace with gunicorn/waitress

### MeasureReport shows `initial-population = 0`

Your data doesn't match the measure's IP criteria. Common causes:

- Encounters lack `class.code` or `type.coding.code` matching the measure's Office-Visit ValueSets
- Patient `birthDate` puts them outside the age range (e.g., CMS130 requires age 50–74 at period end)
- Conditions use ICD-9 codes but measures check SNOMED/ICD-10

Quickest debug: evaluate for one known-good patient (`?subject=Patient/<id>&reportType=subject`), then inspect the MeasureReport's `evaluatedResource` array — it lists exactly which resources contributed to each population, with references to your actual data.

### Concepts table is smaller than expected

Re-run `curl -s -X POST http://localhost:8090/api/materialize -H 'Content-Type: application/json' -d '{"force":true}'` — the terminology flatten is idempotent (`ON CONFLICT DO NOTHING`).

### `$evaluate-measure` times out or is slow on a large dataset

Check that the indexes on `sof.*_flat` are present. They ship in the package as the `setup-03-sof-indexes` Library and are reapplied automatically after each `$materialize`.

```bash
export AIDBOX_USER=<your-admin-user>
export AIDBOX_PASS=<your-admin-password>
export AIDBOX_URL=https://aidbox.example.com

# Inspect the file
cat sql/03-sof-indexes.sql

# Apply via Aidbox $sql
python3 -c "
import json, os, urllib.request, base64
auth = base64.b64encode(f\"{os.environ['AIDBOX_USER']}:{os.environ['AIDBOX_PASS']}\".encode()).decode()
url = f\"{os.environ['AIDBOX_URL']}/\$sql\"
with open('sql/03-sof-indexes.sql') as f:
    body = json.dumps([f.read()]).encode()
req = urllib.request.Request(url, method='POST', data=body)
req.add_header('Authorization', f'Basic {auth}')
req.add_header('Content-Type', 'application/json')
urllib.request.urlopen(req, timeout=300)
print('OK')
"

# Or, if you have direct psql access:
PGPASSWORD="$AIDBOX_PASS" psql -h <host> -U "$AIDBOX_USER" -d <aidbox_db> -f sql/03-sof-indexes.sql
```

Verify the indexes landed:

```bash
curl -u "$AIDBOX_USER:$AIDBOX_PASS" -X POST \
  "$AIDBOX_URL/\$sql" \
  -H 'Content-Type: application/json' \
  -d '["SELECT indexname FROM pg_indexes WHERE schemaname='"'"'sof'"'"' ORDER BY indexname"]'
```

To measure per-measure execution time on your data, use `tools/measure_perf.py`:

```bash
python3 tools/measure_perf.py --base-url "$AIDBOX_URL" \
  --user "$AIDBOX_USER" --password "$AIDBOX_PASS" \
  --label client-baseline --iterations 5
```

This runs the cohort SQL for all 12 measures, samples each 5 times after a warm-up, and writes `tools/perf-client-baseline.json` with median + min/max per measure. Share that file with the maintainers when reporting performance issues.

## Uninstall

Complete removal from your Aidbox:

```bash
# 1. Remove the App resource
curl -u <admin>:<password> -X DELETE \
  https://aidbox.example.com/App/com.sql.evaluate.app

# 2. Stop the Flask container
docker stop sql-evaluate-app && docker rm sql-evaluate-app

# 3. Drop the sof.* materialized tables and the terminology tables
curl -u <admin>:<password> -X POST \
  https://aidbox.example.com/\$sql \
  -H 'Content-Type: application/json' \
  -d '["DROP TABLE IF EXISTS concepts CASCADE; DROP SCHEMA IF EXISTS sof CASCADE;"]'
```

The package's own resources (CodeSystems, ValueSets, ViewDefinitions, Libraries) stay installed in Aidbox until you remove the `healthsamurai.measure-evaluate` package. Nothing calls them once the App is gone.

The clinical FHIR resources (Patient, Encounter, Condition, …) are not affected — the steps above remove only the artifacts installed in Steps 1–4.
