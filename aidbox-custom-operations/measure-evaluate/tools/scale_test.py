#!/usr/bin/env python3
"""
scale_test.py — synthetic scale check for the measure-evaluate sample.

Multiplies the 485 dqm-content test patients N times (each multiplied resource
gets a unique id suffix and is tagged with `measure-evaluate-scale-test`),
runs all 12 measures, and prints per-measure timings for both population and
single-patient reports.

Use this to get an empirical sense of how long Measure/$evaluate-measure takes
on your install with a moderate dataset, before loading real clinical data.
Multiplied data is tagged so `--cleanup` can remove it without touching the
original 485 patients or your own data.

Usage:
    python3 tools/scale_test.py --multiplier 10        # ×10 = ~4 850 patients
    python3 tools/scale_test.py --multiplier 100       # ×100 = ~48 500 patients
    python3 tools/scale_test.py --measure cms130       # restrict to one measure
    python3 tools/scale_test.py --cleanup              # remove all multiplied data
    python3 tools/scale_test.py --base-url http://localhost:9999
"""

import argparse
import base64
import copy
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get("AIDBOX_URL", "http://localhost:8888")
USER = "root"
PASS = "secret"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# scale_test.py lives in tools/ — data/ is one level up
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")

MEASURES = [
    "cms130", "cms125", "cms131", "cms165", "cms124", "cms139",
    "cms75", "cms1154", "cms149", "cms153", "cms155", "cms143",
]

SCALE_TAG = {
    "system": "https://aidbox.app/sample/measure-evaluate",
    "code": "scale-test",
}


def auth_header():
    return base64.b64encode(f"{USER}:{PASS}".encode()).decode()


def http(method, path, body=None, timeout=300, as_json=True):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, method=method, data=data)
    req.add_header("Authorization", f"Basic {auth_header()}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=timeout)
    raw = resp.read()
    if as_json and raw:
        return json.loads(raw)
    return raw


def rewrite_references(node, id_map):
    """Walk JSON and rewrite FHIR-standard refs like Patient/old → Patient/new."""
    if isinstance(node, dict):
        ref = node.get("reference")
        if isinstance(ref, str) and "/" in ref:
            rt, rid = ref.split("/", 1)
            if rid in id_map:
                node["reference"] = f"{rt}/{id_map[rid]}"
        for v in node.values():
            rewrite_references(v, id_map)
    elif isinstance(node, list):
        for item in node:
            rewrite_references(item, id_map)


_CANONICAL_DISPLAY = {
    "condition-clinical": {
        "active": "Active", "recurrence": "Recurrence", "relapse": "Relapse",
        "inactive": "Inactive", "remission": "Remission", "resolved": "Resolved",
    },
    "condition-ver": {
        "unconfirmed": "Unconfirmed", "provisional": "Provisional",
        "differential": "Differential", "confirmed": "Confirmed",
        "refuted": "Refuted", "entered-in-error": "Entered in Error",
    },
}


def sanitize_resource(r):
    """Fix known dqm-content data defects that fail Aidbox validation."""
    if r.get("resourceType") == "Condition":
        for field in ("clinicalStatus", "verificationStatus"):
            block = r.get(field)
            if not block:
                continue
            for coding in block.get("coding", []):
                sys_url = coding.get("system", "")
                code = coding.get("code", "")
                for cs_key, lookup in _CANONICAL_DISPLAY.items():
                    if cs_key in sys_url and code in lookup:
                        coding["display"] = lookup[code]
    if r.get("resourceType") == "Organization":
        if not r.get("name") and not r.get("identifier"):
            r["name"] = "Test Organization"


def make_copy(bundle, copy_index):
    """Deep-copy the bundle, suffix every id, tag every resource."""
    bundle = copy.deepcopy(bundle)
    suffix = f"-st{copy_index:04d}"
    id_map = {}
    for entry in bundle["entry"]:
        r = entry["resource"]
        sanitize_resource(r)
        old_id = r.get("id")
        if not old_id:
            continue
        new_id = f"{old_id}{suffix}"
        id_map[old_id] = new_id
        r["id"] = new_id
        # Tag for cleanup
        meta = r.setdefault("meta", {})
        tags = meta.setdefault("tag", [])
        if SCALE_TAG not in tags:
            tags.append(SCALE_TAG)
        # Rewrite the transaction request.url
        req = entry.get("request", {})
        if req.get("url", "").startswith(f"{r['resourceType']}/"):
            req["url"] = f"{r['resourceType']}/{new_id}"
    rewrite_references(bundle, id_map)
    return bundle


def load_copy(measure_id, copy_index):
    path = os.path.join(DATA_DIR, f"{measure_id}-clinical-data.json")
    if not os.path.exists(path):
        return 0
    with open(path) as f:
        bundle = json.load(f)
    bundle = make_copy(bundle, copy_index)
    http("POST", "/fhir", bundle, timeout=180, as_json=False)
    return len(bundle.get("entry", []))


def patient_count():
    try:
        r = http("POST", "/$sql", ["SELECT count(*) AS n FROM patient"])
        return r[0].get("n", 0) if isinstance(r, list) and r else 0
    except Exception:
        return 0


def pick_tagged_patient():
    """Find one Patient that has our scale-test tag (for single-patient timing)."""
    try:
        tag = f"{SCALE_TAG['system']}|{SCALE_TAG['code']}"
        r = http("GET", f"/fhir/Patient?_tag={tag}&_count=1")
        entries = r.get("entry") if isinstance(r, dict) else None
        if entries:
            return entries[0]["resource"]["id"]
    except Exception:
        pass
    return None


def evaluate_measure(measure, report_type, subject=None):
    """Call $evaluate-measure, return elapsed seconds (or None on error)."""
    params = [
        f"measure={measure}",
        f"reportType={report_type}",
        "periodStart=2026-01-01",
        "periodEnd=2026-12-31",
    ]
    if subject:
        params.append(f"subject=Patient/{subject}")
    t = time.time()
    try:
        http("POST", "/Measure/$evaluate-measure?" + "&".join(params), timeout=900)
        return time.time() - t
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None


def cleanup_scale_test_data():
    """Delete all resources tagged with scale-test.

    Aidbox rejects conditional DELETE on multiple matches (HTTP 412), so we
    page through ids and submit transaction bundles of DELETE entries.
    Order matters: resources that reference Patient must be deleted before
    Patient itself, otherwise FK constraints fail.
    """
    print("Cleaning up scale-test data...")
    tag = f"{SCALE_TAG['system']}|{SCALE_TAG['code']}"
    page_size = 500
    total = 0
    # Order: dependents first, Patient/Practitioner last
    for rt in ["Encounter", "Condition", "Observation", "Procedure",
               "ServiceRequest", "MedicationRequest", "DeviceRequest",
               "Coverage", "Patient", "Practitioner"]:
        deleted = 0
        try:
            while True:
                resp = http("GET", f"/fhir/{rt}?_tag={tag}&_count={page_size}", timeout=120)
                if not isinstance(resp, dict):
                    break
                entries = resp.get("entry", [])
                if not entries:
                    break
                bundle = {
                    "resourceType": "Bundle",
                    "type": "transaction",
                    "entry": [
                        {"request": {"method": "DELETE",
                                     "url": f"{rt}/{e['resource']['id']}"}}
                        for e in entries
                    ],
                }
                http("POST", "/fhir", bundle, timeout=300, as_json=False)
                deleted += len(entries)
                if len(entries) < page_size:
                    break
            if deleted:
                print(f"  Deleted {deleted} {rt}")
            total += deleted
        except urllib.error.HTTPError as e:
            print(f"  Failed {rt}: HTTP {e.code}")
        except Exception as e:
            print(f"  Failed {rt}: {str(e)[:80]}")
    print(f"Cleanup complete: {total} resources removed.")


def main():
    global BASE_URL
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--multiplier", type=int, default=10,
                   help="how many copies of the 485-patient dataset to load (default: 10)")
    p.add_argument("--measure", default=None,
                   help="restrict to one measure id, e.g. cms130 (default: all 12)")
    p.add_argument("--base-url", default=BASE_URL,
                   help=f"Aidbox base URL (default: {BASE_URL})")
    p.add_argument("--cleanup", action="store_true",
                   help="remove all scale-test data and exit")
    args = p.parse_args()

    BASE_URL = args.base_url

    if args.cleanup:
        cleanup_scale_test_data()
        return

    if args.multiplier < 1:
        print("--multiplier must be >= 1", file=sys.stderr)
        sys.exit(2)

    measures = [args.measure] if args.measure else MEASURES
    for m in measures:
        if m not in MEASURES:
            print(f"Unknown measure: {m}. Known: {', '.join(MEASURES)}", file=sys.stderr)
            sys.exit(2)

    print(f"Scale test on {BASE_URL}")
    print(f"  Baseline patient count: {patient_count()}")
    print(f"  Multiplier: ×{args.multiplier}")
    print(f"  Measures: {', '.join(measures)}")
    print()

    # Phase 1 — load multiplied clinical data
    print("[1/2] Loading multiplied clinical data...")
    total = 0
    t0 = time.time()
    for m in measures:
        per_measure = 0
        for i in range(1, args.multiplier + 1):
            try:
                per_measure += load_copy(m, i)
            except urllib.error.HTTPError as e:
                print(f"  FAIL {m} copy {i}: HTTP {e.code}")
                break
            except Exception as e:
                print(f"  FAIL {m} copy {i}: {str(e)[:80]}")
                break
        print(f"  {m}: {per_measure} resources across {args.multiplier} copies")
        total += per_measure
    print(f"  Total: {total} resources in {time.time() - t0:.1f}s")
    print(f"  Patient count now: {patient_count()}")
    print()

    # Phase 2 — measure timings
    print("[2/2] Running measures...")
    header = f"  {'measure':<10}{'population':>14}{'single-patient':>18}"
    print(header)
    print("  " + "-" * (len(header) - 2))
    for m in measures:
        pop = evaluate_measure(m, "population")
        sample_id = pick_tagged_patient()
        single = evaluate_measure(m, "subject", subject=sample_id) if sample_id else None
        pop_s = f"{pop:.2f}s" if pop is not None else "FAIL/timeout"
        sg_s = f"{single:.2f}s" if single is not None else "FAIL/timeout"
        print(f"  {m:<10}{pop_s:>14}{sg_s:>18}")
    print()
    print("Done. To remove scale-test data: python3 scale_test.py --cleanup")


if __name__ == "__main__":
    main()
