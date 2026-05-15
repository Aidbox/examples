# tools/

Utility scripts for working with the sample. Meant
for benchmarking, data prep, and diagnostics.

## `measure_perf.py` — cohort SQL perf benchmark

Runs the cohort SQL for all measures against any reachable Aidbox and
records the per-measure execution time.

### How it runs each measure

For every measure ID it reads `sql/measures/cmsXXX/02-cmsXXX-measure.sql`,
substitutes the measurement period (2026), wraps it with `build_patient_sql`
from `app/evaluate_measure.py` (cohort mode, no subject push-down), and posts
the query to `{BASE_URL}/$sql`. One warm-up call is discarded; the next
`--iterations N` calls are timed. The reported number is the **median** of
those N samples, with the min/max range shown alongside.

### Usage

```bash
# Quick check (single sample, ~25s on 100k patients)
python3 tools/measure_perf.py --label probe

# Reliable measurement (5 samples, median, ~2 min on 100k patients)
python3 tools/measure_perf.py --label baseline --iterations 5

# Against a remote Aidbox
python3 tools/measure_perf.py \
    --label client-prod \
    --base-url https://aidbox.example.com \
    --user $AIDBOX_USER --password $AIDBOX_PASS \
    --iterations 5

# Single measure (diagnostic mode)
python3 tools/measure_perf.py --label cms153-probe --measures cms153 --iterations 10
```

Default base URL is `http://localhost:8888`. Output is written to
`tools/perf-<label>.json` (gitignored) and printed line-per-measure:

```
cms75      median=  312.0ms      (274–388)  rows=97559  ip=16/den=16/exc=7/num=2
```

Columns: median execution time, (min–max) spread, rows returned (= total
patients in the cohort), and the population counts for sanity-checking that
the measure actually evaluated something.

### Comparing two snapshots

```bash
diff <(jq -r '.measures | to_entries[] | "\(.key) \(.value.median_ms)"' tools/perf-before.json) \
     <(jq -r '.measures | to_entries[] | "\(.key) \(.value.median_ms)"' tools/perf-after.json)
```

## `refresh_sof.py` — rebuild sof.*_flat materialized tables

After bulk imports or any change to raw FHIR resources, the `sof.*_flat`
materialized tables go stale — `$materialize` does a full rebuild, there is no
incremental refresh. Schedule this script from cron or run it on demand.

```bash
# default — POSTs to http://localhost:8888 with root/secret
python3 tools/refresh_sof.py

# remote Aidbox
python3 tools/refresh_sof.py \
    --base-url https://aidbox.example.com \
    --user $AIDBOX_USER --password $AIDBOX_PASS
```

What it does:
1. `DROP VIEW IF EXISTS` for each wrapper view CASCADE — PostgreSQL refuses to
   drop a table while a view depends on it, so wrappers must go first.
2. `POST /fhir/ViewDefinition/{id}/$materialize` for each of 9 ViewDefinitions.
3. Re-apply `sql/01-wrapper-views.sql` (recreate wrappers).
4. Re-apply `sql/03-sof-indexes.sql` (CREATE INDEX IF NOT EXISTS + ANALYZE).

Exits non-zero if any `$materialize` call fails — safe for cron monitoring.
On 100k patients the full cycle runs in ~3 seconds; on 1M ~1–2 minutes.

## Other scripts

- `scale_test.py` — multiply the 485 reference patients by N for scale testing.
  Synthetic copies are tagged so `--cleanup` can remove them cleanly. See
  the script docstring for usage.
- `inject_partial_dates.py` — utility for stress-testing the partial-date
  parser in wrapper views.
