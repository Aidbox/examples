#!/usr/bin/env python3
"""Refresh sof.*_flat materialized tables + re-apply indexes + ANALYZE.

For production setups where Patient/Encounter/Condition data changes over time
(bulk imports, new clinical events). $materialize does a full rebuild — there
is no incremental refresh path today. Schedule this script from cron, or run
it on demand after a bulk load.

What it does (idempotent, safe to re-run):
  1. DROP VIEW IF EXISTS for each wrapper view CASCADE. The $materialize
     operation drops sof.X then recreates it; PostgreSQL refuses to drop a
     table while a wrapper view depends on it, so we drop wrappers first.
  2. POST /fhir/ViewDefinition/{id}/$materialize for each of 9 ViewDefinitions
  3. Re-run measures/shared/sql/01-wrapper-views.sql (recreate wrappers)
  4. Re-run measures/shared/sql/03-sof-indexes.sql (CREATE INDEX IF NOT EXISTS
     plus ANALYZE — indexes are dropped on each $materialize because DROP TABLE)
  5. Log per-table row counts and timings

Exits non-zero if any $materialize call fails.

Usage:
    python3 scripts/refresh_sof.py
    python3 scripts/refresh_sof.py --base-url http://localhost:9999
    python3 scripts/refresh_sof.py --vds patient-flat encounter-flat

Cron example (every 4 hours):
    0 */4 * * * /usr/bin/python3 /opt/measure-evaluate/tools/refresh_sof.py \\
                --base-url http://aidbox:8888 --user $AIDBOX_USER --password $AIDBOX_PASS \\
                >> /var/log/sof-refresh.log 2>&1
"""
from __future__ import annotations
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VD_IDS = [
    "patient-flat", "encounter-flat", "condition-flat", "procedure-flat",
    "observation-flat", "observation-bp-flat",
    "servicerequest-flat", "medicationrequest-flat", "devicerequest-flat",
]

WRAPPER_VIEWS_SQL = os.path.join(REPO_ROOT, "sql", "01-wrapper-views.sql")
SOF_INDEXES_SQL = os.path.join(REPO_ROOT, "sql", "03-sof-indexes.sql")

# Wrapper view names that depend on sof.*_flat tables — must be dropped before
# $materialize re-creates the underlying table. Recreated from 01-wrapper-views.sql
# after $materialize completes.
WRAPPER_VIEWS = [
    "patient_flat", "encounter_flat", "condition_flat", "procedure_flat",
    "observation_flat", "observation_bp_flat",
    "servicerequest_flat", "medicationrequest_flat", "devicerequest_flat",
]


def auth_header(user: str, password: str) -> str:
    return "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()


def materialize(vd_id: str, base_url: str, auth: str) -> tuple[bool, str]:
    body = json.dumps({
        "resourceType": "Parameters",
        "parameter": [{"name": "type", "valueCode": "table"}],
    }).encode()
    req = urllib.request.Request(
        f"{base_url}/fhir/ViewDefinition/{vd_id}/$materialize",
        method="POST", data=body,
    )
    req.add_header("Authorization", auth)
    req.add_header("Content-Type", "application/json")
    try:
        urllib.request.urlopen(req, timeout=600)
        return True, ""
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read()[:200].decode(errors='replace')}"
    except Exception as e:
        return False, str(e)[:200]


def run_sql(sql: str, base_url: str, auth: str, timeout: int = 60):
    req = urllib.request.Request(
        f"{base_url}/$sql", method="POST",
        data=json.dumps([sql]).encode(),
    )
    req.add_header("Authorization", auth)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode()
        return json.loads(body) if body.strip() else []


def table_count(vd_id: str, base_url: str, auth: str) -> int | None:
    table = vd_id.replace("-", "_")  # 'patient-flat' → 'patient_flat'
    try:
        r = run_sql(f"SELECT COUNT(*) AS c FROM sof.{table}", base_url, auth)
        return r[0]["c"] if r else None
    except Exception:
        return None


def apply_sql_file(path: str, base_url: str, auth: str, timeout: int = 1800) -> int:
    """Apply a SQL file as a single statement. Returns count of warnings."""
    with open(path) as fh:
        text = fh.read()
    text = "SET LOCAL lock_timeout = '60s';\n" + text
    try:
        run_sql(text, base_url, auth, timeout=timeout)
        return 0
    except Exception as e:
        print(f"  WARN: {os.path.basename(path)}: {str(e)[:120]}")
        return 1


def apply_sql_per_statement(path: str, base_url: str, auth: str, timeout: int = 1800) -> int:
    """Run each SQL statement separately, log per-statement timing.

    Useful for CREATE INDEX / ANALYZE on big tables, where one slow statement
    must not block our diagnostic view of the others, and where per-stmt
    timing pinpoints the offender.
    """
    with open(path) as fh:
        text = fh.read()
    # naive split on ';' — fine for index/analyze files (no procedures, no $$ bodies)
    statements = [s.strip() for s in text.split(';') if s.strip()]
    warnings = 0
    for stmt in statements:
        # short label = first non-comment, non-blank line, truncated
        first_line = next(
            (l.strip() for l in stmt.split('\n')
             if l.strip() and not l.strip().startswith('--')),
            stmt[:60]
        )
        short = first_line[:70]
        t0 = time.time()
        try:
            run_sql(stmt, base_url, auth, timeout=timeout)
            dt = time.time() - t0
            print(f"  OK   {dt:>7.2f}s  {short}")
        except Exception as e:
            dt = time.time() - t0
            warnings += 1
            print(f"  FAIL {dt:>7.2f}s  {short}  — {str(e)[:120]}")
    return warnings


def drop_wrapper_views(base_url: str, auth: str) -> None:
    """Drop wrapper views CASCADE so $materialize can DROP TABLE underneath."""
    for view in WRAPPER_VIEWS:
        try:
            run_sql(f"DROP VIEW IF EXISTS {view} CASCADE", base_url, auth, timeout=30)
        except Exception as e:
            print(f"  WARN: DROP VIEW {view} — {str(e)[:80]}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base-url", default=os.environ.get("AIDBOX_URL", "http://localhost:8888"))
    ap.add_argument("--user", default=os.environ.get("AIDBOX_USER", "root"))
    ap.add_argument("--password", default=os.environ.get("AIDBOX_PASS", "secret"))
    ap.add_argument("--vds", nargs="+", default=VD_IDS,
                    help="ViewDefinition IDs to materialize (default: all 9)")
    args = ap.parse_args()

    auth = auth_header(args.user, args.password)
    print(f"[refresh_sof] target: {args.base_url}")
    print(f"[refresh_sof] VDs: {len(args.vds)}")

    t0 = time.time()

    # Step 1: drop wrapper views (CASCADE) — otherwise $materialize cannot DROP TABLE
    print(f"\n[refresh_sof] Dropping wrapper views (CASCADE) ...")
    drop_wrapper_views(args.base_url, auth)

    # Step 2: $materialize each VD
    print(f"\n[refresh_sof] Materializing {len(args.vds)} ViewDefinitions ...")
    failed = []
    for vd_id in args.vds:
        t_vd = time.time()
        ok, err = materialize(vd_id, args.base_url, auth)
        dt = time.time() - t_vd
        cnt = table_count(vd_id, args.base_url, auth) if ok else None
        cnt_str = f" ({cnt:,} rows)" if cnt is not None else ""
        status = "OK" if ok else "FAIL"
        print(f"  {status:4s} {vd_id:25s} {dt:>6.2f}s{cnt_str}" + (f"  — {err}" if not ok else ""))
        if not ok:
            failed.append(vd_id)

    # Step 3: recreate wrapper views
    print(f"\n[refresh_sof] Re-applying wrapper views from 01-wrapper-views.sql ...")
    t_wrap = time.time()
    warnings_w = apply_sql_file(WRAPPER_VIEWS_SQL, args.base_url, auth)
    print(f"  Done in {time.time()-t_wrap:.2f}s ({warnings_w} warnings)")

    # Step 4: re-apply indexes + ANALYZE — per-statement so a slow CREATE INDEX
    # or ANALYZE on production-sized tables (10M+ observations) doesn't hide
    # behind a single file-level timeout, and so each statement's runtime
    # is visible in the log.
    print(f"\n[refresh_sof] Re-applying indexes + ANALYZE from 03-sof-indexes.sql ...")
    t_idx = time.time()
    warnings_i = apply_sql_per_statement(SOF_INDEXES_SQL, args.base_url, auth)
    print(f"  Done in {time.time()-t_idx:.2f}s ({warnings_i} warnings)")

    elapsed = time.time() - t0
    print(f"\n[refresh_sof] Total: {elapsed:.1f}s, {len(args.vds) - len(failed)}/{len(args.vds)} materialized")
    if failed:
        print(f"[refresh_sof] FAILED: {', '.join(failed)}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
