---
features: [Bulk API, $export, Plan-Net, Provider Directory, S3, MinIO, Presigned URLs]
languages: [TypeScript]
---
# Medicare Plan Finder (MPF)

A minimal TypeScript provider-directory publishing pipeline on Aidbox. The flow:

1. **Export**: kick off a system-level FHIR [`$export`](https://docs.aidbox.app/api/bulk-api/export) with `_typeFilter`, poll to completion, download the gzipped NDJSON.
2. **Scope filter**: walk references from the kept parents and drop children nothing points at.
3. **Bundle**: partition into FHIR collection `Bundle` files plus an `index.json` manifest.
4. **Publish**: upload through Aidbox-presigned URLs to S3-compatible storage (local [MinIO](https://github.com/minio/minio) here). The script holds no bucket credentials.

This is the shape behind CMS provider-directory feeds (Medicare Plan Finder): a crawler starts from `index.json` and downloads the bundles it lists.

## Layout

| File | Purpose |
|---|---|
| `docker-compose.yml` | Aidbox, PostgreSQL, MinIO (buckets auto-created), and an `export` service that runs the pipeline with [Bun](https://bun.sh). |
| `init-bundle.json` | An `AwsAccount` for MinIO, the `provider-export` client with a least-privilege `AccessPolicy`, and a small Plan-Net dataset (one plan, two networks, practitioners in and out of network). |
| `src/main.ts` | Scope config and orchestration of the four steps. |
| `src/aidbox.ts` | Token mint, `$export` start and polling, presigned uploads. |
| `src/filter.ts` | Two-pass scope filter. |
| `src/bundle.ts` | Bundle partitioning and `index.json`. |

## Run

1. Add an Aidbox license to `.env` (obtain one at [aidbox.app](https://aidbox.app)):

   ```bash
   cp .env.example .env
   ```

2. Start the stack. `curl http://localhost:8888/health` returns `200` when ready.

   ```bash
   docker compose up -d
   ```

3. Run the pipeline:

   ```bash
   # "export" is the compose service that runs `bun src/main.ts`. --rm drops the container after
   docker compose run --rm export
   ```

   It prints progress and the manifest URL `http://localhost:9000/provider-directory-publish/index.json`. Bundles are also written to `./output`.

## Adapting

Scope IDs live in `src/main.ts`, sample data and the storage account in `init-bundle.json`. To change the data before a rerun, edit `init-bundle.json` and re-seed with `docker compose down -v && docker compose up -d`, or edit it live in the Aidbox console at http://localhost:8888 (admin / secret). Swap MinIO for S3, GCP, or Azure through the `AwsAccount`.
