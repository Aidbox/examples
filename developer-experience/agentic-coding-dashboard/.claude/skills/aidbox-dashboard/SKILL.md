---
name: aidbox-dashboard
description: Creating dashboards on top of Aidbox FHIR Server using ViewDefinitions
---

# Aidbox FHIR Server

Aidbox runs locally on port 8080 via Docker Compose. All FHIR API requests use the `/fhir/` prefix.

## Creating Dashboards

Dashboards are built using the **SQL on FHIR** approach:

1. **Define a ViewDefinition** — a FHIR resource that describes how to flatten a FHIR resource into tabular columns
2. **Upload and materialize** — run `bun run build:init-bundle -- --upload` to rebuild the init bundle, upload it to Aidbox, and materialize all ViewDefinitions into SQL tables in the `sof` schema
3. **Query with SQL** — the app uses `Bun.SQL` to connect directly to PostgreSQL and queries `sof.<view_name>` for dashboard data
4. **Render a chart** — add a Chart.js chart component in `src/index.ts` and wire it into the appropriate route handler

### Step 1: Create a ViewDefinition

ViewDefinitions are stored as JSON files in `fhir/definitions/view-definitions/`. Use numeric prefixes for ordering (e.g., `01-body-weight.json`).

Each file is a bundle entry with a PUT request:

```json
{
  "request": {
    "method": "PUT",
    "url": "/ViewDefinition/patient-demographics"
  },
  "resource": {
    "resourceType": "ViewDefinition",
    "id": "patient-demographics",
    "name": "patient_demographics",
    "status": "active",
    "resource": "Patient",
    "select": [
      {
        "column": [
          { "path": "getResourceKey()", "name": "id" },
          { "path": "gender", "name": "gender" },
          { "path": "birthDate", "name": "birth_date" }
        ]
      },
      {
        "forEachOrNull": "name.where(use = 'official').first()",
        "column": [
          { "path": "given.join(' ')", "name": "given_name" },
          { "path": "family", "name": "family_name" }
        ]
      }
    ]
  }
}
```

### Step 2: Build, upload, and materialize

After creating or editing a ViewDefinition file, run:

```sh
bun run build:init-bundle -- --upload
```

This single command:
1. Rebuilds `init-bundle.json` from all files in `fhir/definitions/`
2. Uploads the bundle to Aidbox via the FHIR API (using the root client)
3. Calls `$materialize` on each ViewDefinition to create/refresh the corresponding SQL table in the `sof` schema

Without `--upload`, it only rebuilds the JSON file locally.

### Step 3: Query the view with SQL

The app uses `Bun.SQL` (configured in `src/index.ts`) to query the `sof` schema directly:

```ts
import { SQL } from "bun";

const db = new SQL({
  url: process.env.DATABASE_URL ?? "postgresql://aidbox:<POSTGRES_PASSWORD>@localhost:5432/aidbox",
});

// Query a materialized view
const rows = await db.unsafe(
  `SELECT effective_date, weight_kg, unit FROM sof.body_weight WHERE patient_id = $1 ORDER BY effective_date`,
  [patientId],
);
```

Get the actual `POSTGRES_PASSWORD` from `docker-compose.yaml` (`services.postgres.environment.POSTGRES_PASSWORD`).

### Step 4: Render a chart with Chart.js

Charts are rendered using [Chart.js v4](https://www.chartjs.org/) loaded via CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>` in the Layout `<head>`).

See `BodyWeightChart` in `src/index.ts` for the existing pattern:

1. Define a TypeScript interface for the query result rows
2. Create a function that returns a `<canvas>` element + an inline `<script>` that calls `new Chart()`
3. Pass SQL result data as JSON-serialized `labels` and `data` arrays into the Chart.js config
4. Call the function in the route handler and insert the result into the Layout

Example chart function pattern:

```ts
function MyChart({ data }: { data: MyDataPoint[] }) {
  if (data.length === 0) {
    return `<div class="empty">No data found</div>`;
  }

  const chartId = `my-chart-${++chartIdCounter}`;
  const labels = JSON.stringify(data.map((d) => d.date_column));
  const values = JSON.stringify(data.map((d) => d.value_column));

  return `<div class="card">
    <canvas id="${chartId}"></canvas>
    <script>
      new Chart(document.getElementById('${chartId}'), {
        type: 'line',
        data: {
          labels: ${labels},
          datasets: [{
            label: 'My Label',
            data: ${values},
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ctx.parsed.y + ' unit'
              }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Date' }, grid: { display: false } },
            y: { title: { display: true, text: 'Value' }, grace: '5%' }
          }
        }
      });
    </script>
  </div>`;
}
```

Chart.js supports many chart types: `line`, `bar`, `pie`, `doughnut`, `radar`, `scatter`, `bubble`. See [Chart.js docs](https://www.chartjs.org/docs/latest/) for the full API.

Use a unique `chartId` per chart instance (via the `chartIdCounter`) to support multiple charts on one page.

### Database connection

PostgreSQL is exposed on port 5432. Credentials are in `docker-compose.yaml` under `services.postgres.environment`:

| Parameter | Source in `docker-compose.yaml` |
|-----------|-------------------------------|
| Host | `localhost` |
| Port | `5432` |
| Database | `POSTGRES_DB` |
| User | `POSTGRES_USER` |
| Password | `POSTGRES_PASSWORD` |

Connection string format: `postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>`

## ViewDefinition Reference

### Structure

| Field | Required | Description |
|-------|----------|-------------|
| `resourceType` | yes | `"ViewDefinition"` |
| `name` | yes | Database table name (used as `sof.<name>`). Must match `^[A-Za-z][A-Za-z0-9_]*$` |
| `resource` | yes | Target FHIR resource type (e.g., `"Patient"`, `"Observation"`) |
| `status` | yes | `"active"`, `"draft"`, `"retired"`, or `"unknown"` |
| `select` | yes | Array of select blocks defining output columns |
| `where` | no | Array of FHIRPath filter expressions |
| `constant` | no | Named constants referenced as `%name` in FHIRPath |

### Select block

| Field | Description |
|-------|-------------|
| `column` | Array of `{ path, name }` — FHIRPath expression and output column name |
| `forEach` | FHIRPath expression to iterate (creates multiple rows per resource) |
| `forEachOrNull` | Like `forEach` but emits a row with nulls when the collection is empty |
| `unionAll` | Combine multiple select structures |
| `select` | Nested select (cross-join with parent) |

### Common FHIRPath expressions

| Expression | Description |
|------------|-------------|
| `getResourceKey()` | Resource ID |
| `subject.getReferenceKey(Patient)` | Referenced Patient ID (for joins) |
| `gender` | Direct field access |
| `birthDate` | Direct field access |
| `name.where(use = 'official').first()` | Filter and pick first |
| `given.join(' ')` | Join array into string |
| `effective.ofType(dateTime)` | Polymorphic field access |
| `value.ofType(Quantity).value` | Quantity value |
| `value.ofType(Quantity).unit` | Quantity unit |
| `code.coding` | Iterate over codings |
| `code.coding.where(system='http://loinc.org').first()` | Pick specific coding |
| `code.coding.where(system = 'http://loinc.org' and code = '29463-7').exists()` | Filter by coding system + code |

### Example: Body Weight ViewDefinition (with filter)

```json
{
  "resourceType": "ViewDefinition",
  "id": "body-weight",
  "name": "body_weight",
  "status": "active",
  "resource": "Observation",
  "where": [
    {
      "path": "code.coding.where(system = 'http://loinc.org' and code = '29463-7').exists()"
    }
  ],
  "select": [
    {
      "column": [
        { "path": "getResourceKey()", "name": "id" },
        { "path": "subject.getReferenceKey(Patient)", "name": "patient_id" },
        { "path": "effective.ofType(dateTime)", "name": "effective_date" },
        { "path": "value.ofType(Quantity).value", "name": "weight_kg" },
        { "path": "value.ofType(Quantity).unit", "name": "unit" },
        { "path": "status", "name": "status" }
      ]
    }
  ]
}
```

This creates `sof.body_weight` with columns: `id`, `patient_id`, `effective_date`, `weight_kg`, `unit`, `status`.

### Example: Generic Observation ViewDefinition

```json
{
  "resourceType": "ViewDefinition",
  "id": "observation-values",
  "name": "observation_values",
  "status": "active",
  "resource": "Observation",
  "select": [
    {
      "column": [
        { "path": "getResourceKey()", "name": "id" },
        { "path": "subject.getReferenceKey(Patient)", "name": "patient_id" },
        { "path": "status", "name": "status" },
        { "path": "effective.ofType(dateTime)", "name": "effective_date" },
        { "path": "value.ofType(Quantity).value", "name": "value" },
        { "path": "value.ofType(Quantity).unit", "name": "unit" }
      ]
    },
    {
      "forEachOrNull": "code.coding.first()",
      "column": [
        { "path": "system", "name": "code_system" },
        { "path": "code", "name": "code" },
        { "path": "display", "name": "code_display" }
      ]
    }
  ]
}
```

## Auth Clients

Two clients are available. Look up passwords in `docker-compose.yaml` and `fhir/definitions/access-control/`:

| Client | Username | Password source | Use for |
|--------|----------|----------------|---------|
| **Application** | `basic` | `fhir/definitions/access-control/01-client.json` (`resource.secret`) | Normal CRUD + transactions |
| **Root** | `root` | `docker-compose.yaml` (`BOX_ROOT_CLIENT_SECRET`) | Admin operations, uploading init bundle |

Use **root** when the application client gets `Forbidden`.

## Querying Resources via FHIR API

```sh
# Read a specific resource (get BOX_ROOT_CLIENT_SECRET from docker-compose.yaml)
curl -s -u "root:<BOX_ROOT_CLIENT_SECRET>" "http://localhost:8080/fhir/Patient/<id>" | bun -e 'console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()),null,2))'

# Search resources
curl -s -u "root:<BOX_ROOT_CLIENT_SECRET>" "http://localhost:8080/fhir/Patient?name=John&_count=10" | bun -e 'console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()),null,2))'
```

Always use the `/fhir/` prefix. Without it, you get the Aidbox-native format instead of FHIR.

## Init Bundle

FHIR definitions live in `fhir/definitions/` as individual JSON files. **Never edit `init-bundle.json` directly.**

Files are sorted by filename, so use numeric prefixes to control order (e.g., `01-client.json` loads before `02-access-policy.json`).

```sh
# Rebuild, upload, and materialize ViewDefinitions in one step
bun run build:init-bundle -- --upload

# Rebuild only (no upload)
bun run build:init-bundle
```

The init bundle is also auto-loaded on Aidbox startup via `BOX_INIT_BUNDLE` in `docker-compose.yaml`. Note: ViewDefinitions loaded this way still need a `$materialize` call to create the SQL tables.

## Application Code

The app uses `src/aidbox.ts` which wraps the `@health-samurai/aidbox-client` SDK:

```ts
import { aidbox } from "./aidbox";

// Read
const result = await aidbox.read<Patient>({ type: "Patient", id: "pt-1" });

// Search
const result = await aidbox.searchType({ type: "Patient", query: [["name", "John"], ["_count", "10"]] });

// Transaction
await aidbox.transaction({ format: "application/fhir+json", bundle: { resourceType: "Bundle", type: "transaction", entry: [...] } });
```

For dashboard queries, use direct SQL via `Bun.SQL` against the `sof` schema instead of the FHIR API.

## Debugging

### Check Aidbox health
```sh
curl -s "http://localhost:8080/health" | bun -e 'console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()),null,2))'
```

### Inspect a resource
```sh
curl -s -u "root:<BOX_ROOT_CLIENT_SECRET>" "http://localhost:8080/fhir/<ResourceType>/<id>" | bun -e 'console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()),null,2))'
```

### List ViewDefinitions
```sh
curl -s -u "root:<BOX_ROOT_CLIENT_SECRET>" "http://localhost:8080/ViewDefinition?_count=50" | bun -e 'console.log(JSON.stringify(JSON.parse(await Bun.stdin.text()),null,2))'
```

### Test a SQL table exists
```sh
# Via docker exec
docker compose exec postgres psql -U aidbox -d aidbox -c "SELECT * FROM sof.<view_name> LIMIT 5;"
```
