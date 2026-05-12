#!/usr/bin/env python3
"""
inject_partial_dates.py — maintainer test for FHIR partial-date handling.

The FHIR R4 spec allows `dateTime` with partial precision: "2015" (year only)
or "2015-10" (year-month). Customer EHR systems routinely emit such partial
dates for historical events where exact day isn't known.

The naive `01-views.sql` casts every date string to `timestamptz`, which fails:

    ERROR: invalid input syntax for type timestamp with time zone: "2015-10"

This script reproduces the issue by injecting 9 corrupted patient copies
(3 base patients × 3 partial-date patterns), tagged for safe cleanup. After
loading, run any measure to see the cast failure; then apply the
`parse_fhir_datetime` fix in `sql/01-views.sql` and re-run to verify.

Patterns applied:
    pd-ym    — encounter.period.start = "2025-10"        (year-month)
    pd-y     — encounter.period.start = "2025"            (year only)
    pd-cond  — condition.onsetDateTime = "2020-08"        (year-month on condition)

Usage:
    python3 tools/inject_partial_dates.py --base-url http://localhost:6888
    python3 tools/inject_partial_dates.py --cleanup --base-url http://localhost:6888
"""

import argparse
import base64
import copy
import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = "http://localhost:8888"
USER = "root"
PASS = "secret"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")

TAG = {
    "system": "https://aidbox.app/sample/measure-evaluate",
    "code": "partial-date-test",
}

PATTERNS = [
    {"suffix": "pd-ym",   "target": "Encounter", "field": "period.start",  "value": "2025-10", "label": "year-month on encounter.period.start"},
    {"suffix": "pd-y",    "target": "Encounter", "field": "period.start",  "value": "2025",    "label": "year-only on encounter.period.start"},
    {"suffix": "pd-cond", "target": "Condition", "field": "onsetDateTime", "value": "2020-08", "label": "year-month on condition.onsetDateTime"},
]


def auth_header():
    return base64.b64encode(f"{USER}:{PASS}".encode()).decode()


def http(method, path, body=None, timeout=180, as_json=True):
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


def pick_base_patients():
    """Pick 3 dqm-content patients with both Encounter and Condition resources."""
    path = os.path.join(DATA_DIR, "cms130-clinical-data.json")
    with open(path) as f:
        bundle = json.load(f)

    by_patient = {}
    for entry in bundle.get("entry", []):
        r = entry.get("resource", {})
        rt = r.get("resourceType")
        if rt == "Patient":
            bucket = by_patient.setdefault(r["id"], {"patient": None, "encounters": [], "conditions": [], "others": []})
            bucket["patient"] = entry
        else:
            subject = (r.get("subject") or {}).get("reference", "")
            if subject.startswith("Patient/"):
                pid = subject.replace("Patient/", "")
                bucket = by_patient.setdefault(pid, {"patient": None, "encounters": [], "conditions": [], "others": []})
                if rt == "Encounter":
                    bucket["encounters"].append(entry)
                elif rt == "Condition":
                    bucket["conditions"].append(entry)
                else:
                    bucket["others"].append(entry)

    chosen = []
    for pid, bucket in by_patient.items():
        if bucket["patient"] and bucket["encounters"] and bucket["conditions"]:
            chosen.append((pid, bucket))
            if len(chosen) == 3:
                return chosen

    # Fallback: relax — accept patients with encounter only
    for pid, bucket in by_patient.items():
        if bucket["patient"] and bucket["encounters"] and not any(p == pid for p, _ in chosen):
            chosen.append((pid, bucket))
            if len(chosen) == 3:
                return chosen
    return chosen[:3]


def inject(base_bucket, pattern):
    """Build a list of bundle entries — a copy of base_bucket with the pattern applied.
    Returns None if the pattern's target resource isn't in this bucket."""
    suffix = pattern["suffix"]
    target_rt = pattern["target"]
    field_path = pattern["field"].split(".")
    value = pattern["value"]

    entries = [base_bucket["patient"]] + base_bucket["encounters"] + base_bucket["conditions"] + base_bucket["others"]
    entries = [copy.deepcopy(e) for e in entries]

    id_map = {}
    for entry in entries:
        r = entry["resource"]
        old_id = r.get("id")
        if not old_id:
            continue
        new_id = f"{old_id}-{suffix}"
        id_map[old_id] = new_id
        r["id"] = new_id
        meta = r.setdefault("meta", {})
        meta.setdefault("tag", []).append(TAG)
        req = entry.get("request", {})
        if req.get("url", "").startswith(f"{r['resourceType']}/"):
            req["url"] = f"{r['resourceType']}/{new_id}"

    def rewrite_refs(node):
        if isinstance(node, dict):
            ref = node.get("reference")
            if isinstance(ref, str) and "/" in ref:
                rt, rid = ref.split("/", 1)
                if rid in id_map:
                    node["reference"] = f"{rt}/{id_map[rid]}"
            for v in node.values():
                rewrite_refs(v)
        elif isinstance(node, list):
            for item in node:
                rewrite_refs(item)

    for e in entries:
        rewrite_refs(e["resource"])

    # Apply the partial-date corruption to the first matching resource
    applied = False
    for e in entries:
        r = e["resource"]
        if r.get("resourceType") != target_rt:
            continue
        obj = r
        for p in field_path[:-1]:
            if not isinstance(obj, dict) or p not in obj:
                obj = None
                break
            obj = obj[p]
        if isinstance(obj, dict) and field_path[-1] in obj:
            obj[field_path[-1]] = value
            applied = True
            break
        # Try as scalar field on the resource itself (e.g., onsetDateTime is top-level)
        if isinstance(r, dict) and len(field_path) == 1 and field_path[0] in r:
            r[field_path[0]] = value
            applied = True
            break

    return entries if applied else None


def cleanup_partial_date_data():
    print("Cleaning up partial-date test data...")
    tag = f"{TAG['system']}|{TAG['code']}"
    total = 0
    for rt in ["Encounter", "Condition", "Observation", "Procedure",
               "ServiceRequest", "MedicationRequest", "DeviceRequest",
               "Coverage", "Patient", "Practitioner"]:
        deleted = 0
        try:
            while True:
                resp = http("GET", f"/fhir/{rt}?_tag={tag}&_count=500", timeout=60)
                entries = resp.get("entry", []) if isinstance(resp, dict) else []
                if not entries:
                    break
                bundle = {
                    "resourceType": "Bundle", "type": "transaction",
                    "entry": [
                        {"request": {"method": "DELETE", "url": f"{rt}/{e['resource']['id']}"}}
                        for e in entries
                    ],
                }
                http("POST", "/fhir", bundle, timeout=120, as_json=False)
                deleted += len(entries)
                if len(entries) < 500:
                    break
            if deleted:
                print(f"  Deleted {deleted} {rt}")
                total += deleted
        except urllib.error.HTTPError as e:
            print(f"  Skipped {rt}: HTTP {e.code}")
        except Exception as e:
            print(f"  Skipped {rt}: {str(e)[:80]}")
    print(f"Cleanup complete: {total} resources removed.")


def main():
    global BASE_URL
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--base-url", default=BASE_URL)
    p.add_argument("--cleanup", action="store_true")
    args = p.parse_args()
    BASE_URL = args.base_url

    if args.cleanup:
        cleanup_partial_date_data()
        return

    print(f"Injecting partial-date test data on {BASE_URL}")

    base = pick_base_patients()
    if not base:
        print("ERROR: could not pick base patients from cms130-clinical-data.json")
        sys.exit(2)

    print(f"\n[1/2] Picked {len(base)} base patients:")
    for pid, bucket in base:
        print(f"  {pid}  ({len(bucket['encounters'])} encounter(s), {len(bucket['conditions'])} condition(s))")

    print(f"\n[2/2] Generating and loading copies with partial dates:")
    loaded = 0
    skipped = 0
    for pid, bucket in base:
        for pattern in PATTERNS:
            entries = inject(bucket, pattern)
            if entries is None:
                print(f"  SKIP {pid}-{pattern['suffix']}: no matching {pattern['target']}")
                skipped += 1
                continue
            bundle_body = {"resourceType": "Bundle", "type": "transaction", "entry": entries}
            try:
                http("POST", "/fhir", bundle_body, timeout=120, as_json=False)
                print(f"  load {pid}-{pattern['suffix']}: {pattern['label']}")
                loaded += 1
            except urllib.error.HTTPError as e:
                body = e.read().decode()[:200]
                print(f"  FAIL {pid}-{pattern['suffix']}: HTTP {e.code}: {body}")

    print(f"\nLoaded {loaded} corrupted patient copies (skipped: {skipped}).")
    print()
    print("Verify the bug:")
    print(f"  curl -u root:secret -X POST \\")
    print(f"    '{BASE_URL}/Measure/$evaluate-measure?measure=cms130&reportType=population&periodStart=2026-01-01&periodEnd=2026-12-31'")
    print()
    print("Expected BEFORE fix:  ERROR: invalid input syntax for type timestamp with time zone")
    print("Expected AFTER fix:   normal MeasureReport (no error)")
    print()
    print(f"To remove the test data: python3 tools/inject_partial_dates.py --cleanup --base-url {BASE_URL}")


if __name__ == "__main__":
    main()
