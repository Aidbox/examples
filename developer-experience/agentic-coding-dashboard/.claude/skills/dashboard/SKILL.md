---
name: dashboard
description: Creating dashboards on top of Aidbox FHIR Server using ViewDefinitions
---

# Aidbox FHIR Server

Aidbox runs locally on port 8080 via Docker Compose. All FHIR API requests use the `/fhir/` prefix.

## Creating Dashboards

Dashboards are built using the **SQL on FHIR** approach:

1. **Define a ViewDefinition** — a FHIR resource that describes how to flatten a FHIR resource into tabular columns
2. **Aidbox materializes the view** — saving a ViewDefinition automatically creates a SQL view in the `sof` schema in PostgreSQL
3. **Query with SQL** — the app connects directly to PostgreSQL and queries `sof.<view_name>` for dashboard data

### Step 1: Create a ViewDefinition

ViewDefinitions are stored as JSON files in `fhir/definitions/view-definitions/`. Use numeric prefixes for ordering (e.g., `01-patient-demographics.json`).

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

After creating the file, rebuild and upload the init bundle:

```sh
bun run build:init-bundle
curl -s -u "root:<password>" -X POST "http://localhost:8080/fhir" \
  -H "Content-Type: application/fhir+json" \
  -d @init-bundle.json | python3 -m json.tool | tail -20
```

### Step 2: Query the view with SQL

Aidbox creates views in the **`sof`** schema. Connect directly to PostgreSQL and query:

```sql
SELECT * FROM sof.patient_demographics;
SELECT * FROM sof.observation_values WHERE patient_id = 'pt-1' ORDER BY effective_date;
```

### Database connection

PostgreSQL is exposed on port 5432. Credentials are in `docker-compose.yaml`:

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `aidbox` |
| User | `aidbox` |
| Password | `KYRMNQSitF` |

For the app, use a direct `postgres://` connection string to query `sof.*` views.

## ViewDefinition Reference

### Structure

| Field | Required | Description |
|-------|----------|-------------|
| `resourceType` | yes | `"ViewDefinition"` |
| `name` | yes | Database view name (used as `sof.<name>`). Must match `^[A-Za-z][A-Za-z0-9_]*$` |
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

### Example: Observation ViewDefinition

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

This creates `sof.observation_values` with columns: `id`, `patient_id`, `status`, `effective_date`, `value`, `unit`, `code_system`, `code`, `code_display`.

## Auth Clients

Two clients are available:

| Client | Username | Password | Use for |
|--------|----------|----------|---------|
| **Application** | `basic` | `secret` | Normal CRUD + transactions |
| **Root** | `root` | `py26hcPsl9` (from `BOX_ROOT_CLIENT_SECRET` in `docker-compose.yaml`) | Admin operations, uploading init bundle |

Use **root** when the application client gets `Forbidden`.

## Querying Resources via FHIR API

```sh
# Read a specific resource
curl -s -u "root:py26hcPsl9" "http://localhost:8080/fhir/Patient/<id>" | python3 -m json.tool

# Search resources
curl -s -u "root:py26hcPsl9" "http://localhost:8080/fhir/Patient?name=John&_count=10" | python3 -m json.tool
```

Always use the `/fhir/` prefix. Without it, you get the Aidbox-native format instead of FHIR.

## Init Bundle

FHIR definitions live in `fhir/definitions/` as individual JSON files. **Never edit `init-bundle.json` directly.**

Files are sorted by filename, so use numeric prefixes to control order (e.g., `01-client.json` loads before `02-access-policy.json`).

```sh
# Rebuild after editing definition files
bun run build:init-bundle

# Upload to running Aidbox (use root client)
curl -s -u "root:py26hcPsl9" -X POST "http://localhost:8080/fhir" \
  -H "Content-Type: application/fhir+json" \
  -d @init-bundle.json | python3 -m json.tool | tail -20
```

The init bundle is also auto-loaded on Aidbox startup via `BOX_INIT_BUNDLE` in `docker-compose.yaml`.

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

For dashboard queries, use direct SQL against the `sof` schema instead of the FHIR API.

## Debugging

### Check Aidbox health
```sh
curl -s "http://localhost:8080/health" | python3 -m json.tool
```

### Inspect a resource
```sh
curl -s -u "root:py26hcPsl9" "http://localhost:8080/fhir/<ResourceType>/<id>" | python3 -m json.tool
```

### List ViewDefinitions
```sh
curl -s -u "root:py26hcPsl9" "http://localhost:8080/ViewDefinition?_count=50" | python3 -m json.tool
```

### Test a SQL view exists
```sh
# Via psql
psql "postgresql://aidbox:KYRMNQSitF@localhost:5432/aidbox" -c "SELECT * FROM sof.<view_name> LIMIT 5;"
```
