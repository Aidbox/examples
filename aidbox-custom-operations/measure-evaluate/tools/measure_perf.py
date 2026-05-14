#!/usr/bin/env python3
"""Cohort SQL perf benchmark for 12 measures on AME Aidbox.

Mirrors aidbox-cql-poc/experiments/dba-optimization/measure_perf.py, but reads
measure SQL from this repo's sql/measures/cmsXXX/02-cmsXXX-measure.sql layout
and targets the AME Aidbox at http://localhost:8888 by default.

Usage:
  python3 tools/measure_perf.py --label before
  python3 tools/measure_perf.py --label after
"""
from __future__ import annotations
import argparse, base64, json, sys, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "app"))
import evaluate_measure as em  # noqa: E402

MEASURES = [
    "cms75", "cms124", "cms125", "cms130", "cms131", "cms139",
    "cms143", "cms149", "cms153", "cms155", "cms165", "cms1154",
]
PERIOD_START = "2026-01-01"
PERIOD_END = "2026-12-31"
OUT_DIR = ROOT / "tools"


def auth(u: str, p: str) -> str:
    return "Basic " + base64.b64encode(f"{u}:{p}".encode()).decode()


def run_sql(query: str, base_url: str, user: str, password: str, timeout: int = 300):
    req = urllib.request.Request(
        f"{base_url}/$sql", method="POST",
        data=json.dumps([query]).encode(),
    )
    req.add_header("Authorization", auth(user, password))
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def build_cohort_sql(measure_id: str) -> str:
    sql_path = ROOT / "sql" / "measures" / measure_id / f"02-{measure_id}-measure.sql"
    sql = sql_path.read_text()
    sql = em.parameterize_sql(sql, PERIOD_START, PERIOD_END)
    return em.build_patient_sql(sql, None)


def measure_one(measure_id: str, base_url: str, user: str, password: str,
                warm: bool = True, iterations: int = 1) -> dict:
    """Run cohort SQL `iterations` times after one warmup. Report median+min+max."""
    cohort_sql = build_cohort_sql(measure_id)
    if warm:
        try:
            run_sql(cohort_sql, base_url, user, password)
        except Exception as e:
            return {"error": f"warmup failed: {e}"}
    samples: list[float] = []
    last_rows = None
    for _ in range(iterations):
        t0 = time.time()
        try:
            rows = run_sql(cohort_sql, base_url, user, password)
        except urllib.error.HTTPError as e:
            return {"error": f"HTTP {e.code}: {e.read()[:200].decode(errors='replace')}"}
        except Exception as e:
            return {"error": str(e)[:200]}
        samples.append((time.time() - t0) * 1000)
        last_rows = rows
    rows = last_rows or []
    n_rows = len(rows) if isinstance(rows, list) else 0
    n_ip = sum(1 for r in rows if r.get("ip"))
    n_den = sum(1 for r in rows if r.get("den"))
    n_exc = sum(1 for r in rows if r.get("exc"))
    n_num = sum(1 for r in rows if r.get("num"))
    samples.sort()
    median = samples[len(samples) // 2]
    return {
        "samples_ms": [round(s, 1) for s in samples],
        "median_ms": round(median, 1),
        "min_ms": round(min(samples), 1),
        "max_ms": round(max(samples), 1),
        "rows": n_rows,
        "ip": n_ip, "den": n_den, "exc": n_exc, "num": n_num,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base-url", default="http://localhost:8888")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="secret")
    ap.add_argument("--label", required=True)
    ap.add_argument("--no-warmup", action="store_true")
    ap.add_argument("--iterations", type=int, default=1, help="timed samples per measure")
    ap.add_argument("--measures", nargs="+", default=MEASURES)
    args = ap.parse_args()

    snap = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "base_url": args.base_url,
        "label": args.label,
        "warmup": not args.no_warmup,
        "iterations": args.iterations,
        "measures": {},
    }
    print(f"label={args.label}  base_url={args.base_url}  warmup={not args.no_warmup}  iterations={args.iterations}")
    for mid in args.measures:
        print(f"  {mid:8s} ", end="", flush=True)
        result = measure_one(mid, args.base_url, args.user, args.password,
                             warm=not args.no_warmup, iterations=args.iterations)
        snap["measures"][mid] = result
        if "error" in result:
            print(f"  ERROR: {result['error']}")
        else:
            spread = f"({result['min_ms']:.0f}–{result['max_ms']:.0f})"
            print(f"  median={result['median_ms']:>7.1f}ms {spread:>14s}  rows={result['rows']:6d}  "
                  f"ip={result['ip']}/den={result['den']}/exc={result['exc']}/num={result['num']}")

    out_path = OUT_DIR / f"perf-{args.label}.json"
    out_path.write_text(json.dumps(snap, indent=2))
    total_ms = sum(r.get("median_ms", 0) for r in snap["measures"].values() if "error" not in r)
    print(f"\nTotal median: {total_ms:.0f}ms across {len(args.measures)} measures")
    print(f"Wrote {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
