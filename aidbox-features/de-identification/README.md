---
features: [De-Identification, SQL on FHIR, HIPAA, Analytics, ViewDefinition]
languages: [JSON, SQL]
---
# De-Identification with ViewDefinitions

Use Aidbox's per-column de-identification to create analytics-ready tables without exposing patient identifiers. This example uses the pre-built [`io.health-samurai.de-identification.r4`](https://get-ig.org/io.health-samurai.de-identification.r4) package which provides Safe Harbor ViewDefinitions for 17 FHIR R4 resource types.

Read the full walkthrough: [HIPAA Safe Harbor De-Identification in Aidbox](https://www.health-samurai.io/blog/hipaa-safe-harbor-de-identification-in-aidbox).

## Prerequisites

1. Docker
2. Cloned repository

```
git clone https://github.com/Aidbox/examples.git
cd examples/aidbox-features/de-identification
```

## 1. Start Aidbox

```sh
docker compose up
```

The init bundle registers an [AidboxMigration](https://www.health-samurai.io/docs/aidbox/configuration/migrations) that installs the de-identification package from the [artifact registry](https://get-ig.org/io.health-samurai.de-identification.r4) on startup.

Open the [Aidbox console](http://localhost:8080/ui/console#/) and log in with password `admin`.

## 2. Load sample data

On the Aidbox home page, click **Import Data** → **Import synthetic dataset**. This imports 100 Synthea patients (and related Encounters, Observations, Conditions, etc.).

See the [sample data guide](https://www.health-samurai.io/docs/aidbox/getting-started/upload-sample-data) for details or larger datasets.

## 3. Open the Patient ViewDefinition

Navigate to **Resource browser** in the sidebar and open ViewDefinitions.
Select `hipaa-patient`.
The **ViewDefinition Builder** tab shows each column with its de-identification method — shield icons indicate which columns are protected.

## 4. Set cryptographic keys

The ViewDefinition ships with blank keys (`""`).
Click the shield icon on any protected column (e.g. `id` with `cryptoHash`) and enter a key value. Use the same key across all columns that need to be joinable — for example, set `cryptoHashKey` to `my-research-key` on every `cryptoHash` column.

Do the same for `dateShiftKey` on date-shifted columns.

## 5. Run to preview results

Click **Run** in the builder to preview the de-identified output. You'll see:

- Patient IDs replaced with HMAC-SHA256 hashes
- Birth dates shifted (or redacted for patients over 89 via `birthDateSafeHarbor`)
- Names redacted to NULL
- Gender and other non-identifying fields passed through

Verify the output looks correct before materializing.

## 6. Materialize

Click **Materialize** and select **Table** as the type. This creates `sof.hipaa_patient` in the database.

> **Note:** ViewDefinitions with de-identification extensions can only be materialized as `table` — not `view` or `materialized-view`. Views expose cryptographic keys in PostgreSQL system catalogs.

## 7. Query the materialized table

Open the [SQL console](http://localhost:8080/ui/console#/sql) and query the de-identified data:

```sql
SELECT * FROM sof.hipaa_patient;
```

All patient identifiers are transformed — hashed IDs, shifted dates, redacted names. The clinical data (gender, marital status, etc.) is preserved.

### Example queries

Count patients by gender:

```sql
SELECT gender, count(*) FROM sof.hipaa_patient GROUP BY 1;
```

Check that birth dates are shifted (compare with raw FHIR data):

```sql
SELECT p.id, p.resource#>>'{birthDate}' AS real_birthdate, h.birth_date AS shifted_birthdate
FROM patient p
JOIN sof.hipaa_patient h ON public.aidbox_deident_crypto_hash(p.id::text, 'my-research-key') = h.id;
```

## How it works

1. **Pre-built ViewDefinitions** apply de-identification methods per column — `cryptoHash` on identifiers, `dateshift` on dates, `redact` on names
2. **`birthDateSafeHarbor`** on Patient.birthDate automatically redacts when age >89 (HIPAA Safe Harbor requirement)
3. **Materialized tables** contain only transformed data — cryptographic keys stay inside the ViewDefinition resource, protected by access control
4. The **same `cryptoHashKey`** across ViewDefinitions means hashed IDs are joinable — de-identify multiple resource types and still link them by patient

## Learn more

- [Blog post: HIPAA Safe Harbor De-Identification in Aidbox](https://www.health-samurai.io/articles/hipaa-safe-harbor-de-identification-in-aidbox)
- [De-identification documentation](https://docs.aidbox.app/modules/sql-on-fhir/de-identification)
- [SQL on FHIR documentation](https://docs.aidbox.app/modules/sql-on-fhir)
