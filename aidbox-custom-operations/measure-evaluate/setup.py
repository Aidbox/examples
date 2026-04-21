#!/usr/bin/env python3
"""
Setup script for measure-evaluate example.

Creates shared views, loads terminology and clinical data for all 12 measures.
Run after `docker compose up --build` and Aidbox activation.

Usage:
    python3 setup.py
    python3 setup.py --base-url http://localhost:9999
"""

import json
import os
import sys
import urllib.request
import base64
import time

BASE_URL = os.environ.get("AIDBOX_URL", "http://localhost:8888")
USER = "root"
PASS = "secret"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

MEASURES = [
    "cms130", "cms125", "cms131", "cms165",
    "cms124", "cms139", "cms75", "cms1154",
    "cms149", "cms153", "cms155", "cms143",
]


def auth_header():
    return base64.b64encode(f"{USER}:{PASS}".encode()).decode()


def run_sql(sql):
    req = urllib.request.Request(
        f"{BASE_URL}/$sql", method="POST",
        data=json.dumps([sql]).encode(),
    )
    req.add_header("Authorization", f"Basic {auth_header()}")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=60)
    body = resp.read().decode()
    return json.loads(body) if body.strip() else []


def load_bundle(filepath, label):
    if not os.path.exists(filepath):
        print(f"  SKIP {label} — not found")
        return

    with open(filepath) as f:
        bundle = json.load(f)

    entries = bundle.get("entry", [])
    creds = auth_header()

    req = urllib.request.Request(
        f"{BASE_URL}/fhir", method="POST",
        data=json.dumps(bundle).encode(),
    )
    req.add_header("Authorization", f"Basic {creds}")
    req.add_header("Content-Type", "application/json")

    try:
        urllib.request.urlopen(req, timeout=120)
        print(f"  OK {label} — {len(entries)} entries")
        return
    except Exception:
        pass

    # Fallback: one by one
    loaded, failed = 0, 0
    failed_entries = []
    for entry in entries:
        b = {"resourceType": "Bundle", "type": "transaction", "entry": [entry]}
        r = urllib.request.Request(
            f"{BASE_URL}/fhir", method="POST",
            data=json.dumps(b).encode(),
        )
        r.add_header("Authorization", f"Basic {creds}")
        r.add_header("Content-Type", "application/json")
        try:
            urllib.request.urlopen(r, timeout=30)
            loaded += 1
        except Exception:
            failed_entries.append(entry)
            failed += 1

    # Retry failed (references may now exist)
    for entry in failed_entries:
        b = {"resourceType": "Bundle", "type": "transaction", "entry": [entry]}
        r = urllib.request.Request(
            f"{BASE_URL}/fhir", method="POST",
            data=json.dumps(b).encode(),
        )
        r.add_header("Authorization", f"Basic {creds}")
        r.add_header("Content-Type", "application/json")
        try:
            urllib.request.urlopen(r, timeout=30)
            loaded += 1
            failed -= 1
        except Exception:
            pass

    print(f"  OK {label} — {loaded}/{loaded + failed} entries")


def populate_concepts(valueset_path):
    if not os.path.exists(valueset_path):
        return 0

    with open(valueset_path) as f:
        bundle = json.load(f)

    total = 0
    for entry in bundle.get("entry", []):
        vs = entry.get("resource", {})
        if vs.get("resourceType") != "ValueSet":
            continue
        url = vs.get("url", "")
        name = vs.get("name", "")
        codes = vs.get("expansion", {}).get("contains", [])
        if not url or not codes:
            continue

        try:
            run_sql(f"DELETE FROM concepts WHERE valueset_url = '{url}'")
        except Exception:
            pass

        values = []
        for c in codes:
            s = c.get("system", "").replace("'", "''")
            code = c.get("code", "").replace("'", "''")
            display = c.get("display", "").replace("'", "''")[:200]
            values.append(f"('{url}', '{name}', '{s}', '{code}', '{display}')")

        for i in range(0, len(values), 500):
            chunk = values[i:i + 500]
            sql = "INSERT INTO concepts (valueset_url, valueset_name, system, code, display) VALUES\n" + ",\n".join(chunk)
            try:
                run_sql(sql)
            except Exception as e:
                print(f"  FAIL concepts for {name}: {e}")
                break
        total += len(codes)
    return total


def create_stubs():
    creds = auth_header()
    stubs = {
        "Organization/example": {"resourceType": "Organization", "id": "example", "name": "Example Organization"},
        "Practitioner/example": {"resourceType": "Practitioner", "id": "example", "name": [{"family": "Example", "given": ["Practitioner"]}]},
        "Device/cqf-tooling": {"resourceType": "Device", "id": "cqf-tooling", "deviceName": [{"name": "CQF Tooling", "type": "user-friendly-name"}]},
    }
    for ref, resource in stubs.items():
        req = urllib.request.Request(
            f"{BASE_URL}/fhir/{ref}", method="PUT",
            data=json.dumps(resource).encode(),
        )
        req.add_header("Authorization", f"Basic {creds}")
        req.add_header("Content-Type", "application/json")
        try:
            urllib.request.urlopen(req, timeout=10)
        except Exception:
            pass
    print("  OK Stubs — Organization, Practitioner, Device")


def execute_sql_file(filepath, label):
    if not os.path.exists(filepath):
        print(f"  SKIP {label} — not found")
        return

    with open(filepath) as f:
        content = f.read()

    statements = [s.strip() for s in content.split(";") if s.strip()]
    for stmt in statements:
        try:
            run_sql(stmt)
        except Exception as e:
            print(f"  FAIL {label}: {str(e)[:80]}")
            return
    print(f"  OK {label} — {len(statements)} statements")


def main():
    global BASE_URL

    skip_clinical = False
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--skip-clinical":
            skip_clinical = True
            i += 1
        elif a.startswith("--base-url"):
            if "=" in a:
                BASE_URL = a.split("=", 1)[1]
                i += 1
            else:
                BASE_URL = args[i + 1] if i + 1 < len(args) else BASE_URL
                i += 2
        else:
            i += 1

    print(f"Setting up measure-evaluate on {BASE_URL}")
    if skip_clinical:
        print("  --skip-clinical: will NOT load the 485 sample dqm-content patients")
    print(f"Data directory: {SCRIPT_DIR}")
    print()

    # Wait for Aidbox
    print("[1/5] Waiting for Aidbox...")
    for i in range(30):
        try:
            req = urllib.request.Request(f"{BASE_URL}/health")
            urllib.request.urlopen(req, timeout=5)
            print("  OK — Aidbox is ready")
            break
        except Exception:
            if i < 29:
                time.sleep(2)
            else:
                print("  FAIL — Aidbox not responding. Is it running and activated?")
                sys.exit(1)

    # Create shared views + concepts table + shared exclusion functions
    print("[2/5] Creating shared SQL infrastructure...")
    execute_sql_file(os.path.join(SCRIPT_DIR, "sql", "00-terminology.sql"), "Concepts table")
    execute_sql_file(os.path.join(SCRIPT_DIR, "sql", "01-views.sql"), "Shared views")
    execute_sql_file(os.path.join(SCRIPT_DIR, "sql", "02-shared-exclusions.sql"), "Shared exclusions")

    # Create stubs
    print("[3/5] Creating stub resources...")
    create_stubs()

    # Load shared CodeSystems
    print("[4/6] Loading shared CodeSystems...")
    load_bundle(os.path.join(SCRIPT_DIR, "data", "codesystems-bundle.json"), "CodeSystems")

    # Load FHIR Measure resources
    print("[5/6] Loading FHIR Measure resources...")
    load_bundle(os.path.join(SCRIPT_DIR, "data", "measures-bundle.json"), "Measure resources")

    # Load each measure
    print(f"[6/6] Loading {len(MEASURES)} measures...")
    for i, m in enumerate(MEASURES, 1):
        print(f"\n  [{i}/{len(MEASURES)}] {m.upper()}")

        # ValueSets
        vs_path = os.path.join(SCRIPT_DIR, "data", f"{m}-valuesets.json")
        load_bundle(vs_path, "ValueSets")

        # Clinical data (the 485 dqm-content test patients — skip for existing Aidbox installs)
        if not skip_clinical:
            cd_path = os.path.join(SCRIPT_DIR, "data", f"{m}-clinical-data.json")
            load_bundle(cd_path, "Clinical data")

        # Concepts
        new = populate_concepts(vs_path)
        if new:
            print(f"  OK Concepts — {new} codes")

    # Summary
    try:
        patients = run_sql("SELECT COUNT(*) AS n FROM patient")
        concepts = run_sql("SELECT COUNT(*) AS n FROM concepts")
        print(f"\n{'='*50}")
        print(f"  Setup complete!")
        print(f"  Patients: {patients[0]['n']}")
        print(f"  Concepts: {concepts[0]['n']}")
        print(f"  Measures: {len(MEASURES)}")
        print(f"\n  Demo: open demo/app.html in browser")
        print(f"  API:  POST {BASE_URL}/Measure/$evaluate-measure")
        print(f"{'='*50}")
    except Exception:
        print("\nSetup complete!")


if __name__ == "__main__":
    main()
