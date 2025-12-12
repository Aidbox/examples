---
features: [Analytics, Clickhouse, Superset, SQL on FHIR, Data visualization]
languages: [Markdown]
---
# Real-Time Analytics with Aidbox, ClickHouse, and Superset

This example demonstrates how to use SQL on FHIR with Aidbox, integrate it with ClickHouse for analytics, and visualize data using Superset.

## Prerequisites

1. Docker
2. Bun.js (https://bun.sh/)
3. Cloned repository: [GitHub: Aidbox/examples](https://github.com/Aidbox/examples/tree/main)
4. Working directory: `clickhouse-superset`

## Setup Instructions

### 1. Start Aidbox, ClickHouse, and Superset

First, create a `.env` file from the example template:

```bash
cp docker/.env.example docker/.env
```

Update the `docker/.env` file with your desired configuration (passwords, credentials, etc.).

Then start all services:

```bash
docker compose --env-file docker/.env up 
```

### 2. Create ClickHouse Tables

Navigate to `http://localhost:8123/play` and create the following tables:

```sql
CREATE TABLE IF NOT EXISTS appointment_cancelation
(
  `id` String,
  `status` Nullable(String),
  `cancelationReason` Nullable(String),
  `cts` DateTime64,
  `ts` DateTime64,
  `is_deleted` UInt8 default 0
)
ENGINE = ReplacingMergeTree(ts, is_deleted)
ORDER BY (id)
SETTINGS min_age_to_force_merge_seconds = 30;
```

```sql
CREATE TABLE IF NOT EXISTS encounter_class_and_type
(
  `id` String,
  `type` Nullable(String),
  `status` Nullable(String),
  `period_start` Nullable(DateTime64),
  `period_end` Nullable(DateTime64),
  `cts` DateTime64,
  `ts` DateTime64,
  `is_deleted` UInt8 default 0
)
ENGINE = ReplacingMergeTree(ts, is_deleted)
ORDER BY (id)
SETTINGS min_age_to_force_merge_seconds = 30;
```

```sql
CREATE TABLE IF NOT EXISTS encounter_patient_and_practitioner
(
  `id` String,
  `type` Nullable(String),
  `class` Nullable(String),
  `period_start` Nullable(DateTime64),
  `period_end` Nullable(DateTime64),
  `patient` Nullable(String),
  `practitioner` Nullable(String),
  `cts` DateTime64,
  `ts` DateTime64,
  `is_deleted` UInt8 default 0
)
ENGINE = ReplacingMergeTree(ts, is_deleted)
ORDER BY (id)
SETTINGS min_age_to_force_merge_seconds = 30;
```

```sql
CREATE TABLE IF NOT EXISTS practitioner_flat
(
  `id` String,
  `given` Nullable(String),
  `family` Nullable(String),
  `cts` DateTime64,
  `ts` DateTime64,
  `is_deleted` UInt8 default 0
)
ENGINE = ReplacingMergeTree(ts, is_deleted)
ORDER BY (id)
SETTINGS min_age_to_force_merge_seconds = 30;
```

```sql
CREATE or replace VIEW practitioner_workload_view AS 
SELECT id, type, class, period_start, period_end, patient, concat(given, ' ', family)
FROM encounter_patient_and_practitioner LEFT JOIN practitioner_flat
ON encounter_patient_and_practitioner.practitioner = practitioner_flat.id
```

### 3. Configure Aidbox Resources

1. Navigate to `http://localhost:8888/ui/console#/notebooks`
2. Upload the notebook `prepare for analytics.html`
3. Execute each step in the notebook

> **Note:** When creating `TopicDestination` resources, use the ClickHouse credentials (`CLICKHOUSE_USER` and `CLICKHOUSE_PASSWORD`) configured in your `.env` file.

### 4. Import Superset Dashboard

Before creating the archive, update the ClickHouse credentials in `dashboard/databases/ClickHouse_Connect_Superset.yaml` to match your `.env` configuration:

```yaml
sqlalchemy_uri: clickhousedb+connect://<CLICKHOUSE_USER>:<CLICKHOUSE_PASSWORD>@clickhouse:8123/default
```

Then create a zip archive of the `dashboard` folder:

```bash
zip -vr dashboard.zip dashboard
```

Navigate to `http://localhost:8088/dashboard/list` and import the zip archive.

### 5. Generate Sample Resources

1. Navigate to `http://localhost:8888/ui/console#/iam/sandbox/basic` and create a client with basic authentication
2. Go to the `generator` folder and run the following command:

```bash
bun run index.ts --auth "Basic <your-base64-encoded-credentials>"
```

Open the dashboard to see the data populate. You can enable auto-refresh to watch the changes in real time.
