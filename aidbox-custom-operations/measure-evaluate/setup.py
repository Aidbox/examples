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
import urllib.error
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

# Wrapper views that depend on sof.*_flat tables. Must be dropped before
# $materialize because Postgres refuses to DROP TABLE while a view depends
# on it. Recreated from 01-wrapper-views.sql after $materialize completes.
WRAPPER_VIEWS = [
    "patient_flat", "encounter_flat", "condition_flat", "procedure_flat",
    "observation_flat", "observation_bp_flat",
    "servicerequest_flat", "medicationrequest_flat", "devicerequest_flat",
]


CANONICAL_VD_BASE = "https://health-samurai.io/fhir/ViewDefinition"


def auth_header():
    return base64.b64encode(f"{USER}:{PASS}".encode()).decode()


def resolve_vd_id(vd_id):
    """Map a ViewDefinition's canonical url to its runtime resource id.

    ViewDefinitions are delivered by the FHIR package (init bundle -> $fhir-package-install),
    which re-keys them to a far-assigned GUID id (canonical url preserved). $materialize is
    addressed by id (ViewDefinition/<id>/$materialize), so we look up the runtime id by url.
    Falls back to <vd_id> when search finds nothing (e.g. a VD PUT under its stable id)."""
    from urllib.parse import quote
    url = f"{CANONICAL_VD_BASE}/{vd_id}"
    req = urllib.request.Request(
        f"{BASE_URL}/fhir/ViewDefinition?url={quote(url, safe='')}&_elements=id")
    req.add_header("Authorization", f"Basic {auth_header()}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            entries = json.loads(resp.read().decode()).get("entry", [])
        return entries[0]["resource"]["id"] if entries else vd_id
    except Exception:
        return vd_id


def run_sql(sql, timeout=60):
    req = urllib.request.Request(
        f"{BASE_URL}/$sql", method="POST",
        data=json.dumps([sql]).encode(),
    )
    req.add_header("Authorization", f"Basic {auth_header()}")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=timeout)
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

    total = loaded + failed
    if loaded == 0:
        status = "FAIL"
    elif failed == 0:
        status = "OK"
    else:
        status = "PARTIAL"
    print(f"  {status} {label} — {loaded}/{total} entries")


def populate_concepts(valueset_path):
    """Build the flat `concepts` table from Aidbox's far.valueset registry (no row loader).

    The ValueSets were already loaded into Aidbox by load_bundle (-> far.valueset). This
    flattens their expansion.contains into `concepts` with ONE SQL per measure. Idempotent
    per valueset_url (DELETE + INSERT). Reads the Aidbox-internal `far` schema.
    """
    if not os.path.exists(valueset_path):
        return 0

    with open(valueset_path) as f:
        bundle = json.load(f)

    urls = sorted({
        e.get("resource", {}).get("url")
        for e in bundle.get("entry", [])
        if e.get("resource", {}).get("resourceType") == "ValueSet" and e.get("resource", {}).get("url")
    })
    if not urls:
        return 0

    url_list = "(" + ",".join("'" + u.replace("'", "''") + "'" for u in urls) + ")"
    run_sql(f"DELETE FROM concepts WHERE valueset_url IN {url_list}")
    run_sql(
        f"""INSERT INTO concepts (valueset_url, valueset_name, system, code, display)
            SELECT DISTINCT
                resource->>'url'  AS valueset_url,
                resource->>'name' AS valueset_name,
                c->>'system'      AS system,
                c->>'code'        AS code,
                left(c->>'display', 200) AS display
            FROM far.valueset,
                 jsonb_array_elements(resource->'expansion'->'contains') AS c
            WHERE resource->>'url' IN {url_list}
              AND c->>'code' IS NOT NULL
              AND c->>'system' IS NOT NULL"""
    )
    r = run_sql(f"SELECT count(*) AS n FROM concepts WHERE valueset_url IN {url_list}")
    return r[0]["n"] if r else 0


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


def execute_sql_file(filepath, label, timeout=60):
    if not os.path.exists(filepath):
        print(f"  SKIP {label} — not found")
        return
    with open(filepath) as f:
        content = f.read()
    # Prepend lock_timeout so that DROP VIEW / DROP TABLE statements give up
    # promptly when something else is holding a conflicting lock, instead of
    # queueing on the server for hours after our HTTP client has already
    # timed out. lock_timeout only applies to lock acquisition — long ANALYZE
    # statements are not affected.
    content = "SET LOCAL lock_timeout = '60s';\n" + content
    try:
        # Aidbox $sql wraps the whole call in one transaction — a mid-file
        # error rolls back every preceding statement, so this is safe to retry.
        run_sql(content, timeout=timeout)
        # Rough count of '`;`' for the log line — not used for execution, just diagnostics.
        print(f"  OK {label} — {content.count(';')} SQL statements")
    except Exception as e:
        print(f"  FAIL {label}: {str(e)[:200]}")


def main():
    global BASE_URL

    # Default: do NOT load the 485 dqm-content demo patients — safe for
    # production installs. Pass --demo-patients to load them (for demo/dev).
    # --skip-clinical kept as silent no-op for backward compatibility.
    load_demo_patients = False
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--demo-patients":
            load_demo_patients = True
            i += 1
        elif a == "--skip-clinical":
            # backward-compat: this is now the default
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
    skip_clinical = not load_demo_patients

    print(f"Setting up measure-evaluate on {BASE_URL}")
    if skip_clinical:
        print("  Loading infrastructure only (pass --demo-patients to load 485 sample dqm-content patients)")
    else:
        print("  --demo-patients: will load 485 sample dqm-content patients")
    print(f"Data directory: {SCRIPT_DIR}")
    print()

    # Wait for Aidbox
    print("[1/6] Waiting for Aidbox...")
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

    # Definitions (ViewDefinitions, SQLQuery Libraries, and terminology
    # CodeSystems/ValueSets) are delivered by the FHIR package at boot via
    # $fhir-package-install (init.json). setup.py owns only runtime state:
    # the concepts flatten, clinical demo data, $materialize, wrapper views,
    # shared functions, and indexes.
    #
    # The local viewdefinitions/ dir is still the list of VD ids to materialize;
    # package install re-keys each VD to a far-assigned GUID id (canonical url
    # preserved), so we resolve slug id -> runtime id by url before $materialize.
    vd_dir = os.path.join(SCRIPT_DIR, "viewdefinitions")
    all_vd_ids = [f.replace(".json", "") for f in sorted(os.listdir(vd_dir)) if f.endswith(".json")]
    # The `concept` VD is MANUALLY materialized (sof.concept via the concepts flatten
    # in 00-terminology.sql + populate_concepts) — Aidbox stores ValueSets only in the
    # far registry, so $materialize cannot populate it. Exclude it from the $materialize
    # loop; every other (flat) VD is materialized normally.
    vd_ids = [v for v in all_vd_ids if v != "concept"]

    # Create concepts view (sof.concept + `concepts` wrapper)
    print("[2/6] Creating concepts view...")
    execute_sql_file(os.path.join(SCRIPT_DIR, "sql", "00-terminology.sql"), "Concepts view")

    # Create stubs
    print("[3/6] Creating stub resources...")
    create_stubs()

    # Load each measure's runtime state. Terminology (CodeSystems/ValueSets) and
    # Measure resources come from the FHIR package, so we do NOT re-upload the
    # data/*-valuesets.json / measures-bundle.json bundles here (that would be
    # redundant — PUT is idempotent by url either way). We read data/<m>-valuesets.json
    # only for the list of valueset urls to flatten into `concepts` from far.valueset
    # (which the package populated). Clinical demo data is NOT in the package, so it
    # is loaded here when --demo-patients is passed.
    print(f"[4/6] Loading {len(MEASURES)} measures (concepts flatten + clinical data)...")
    for i, m in enumerate(MEASURES, 1):
        print(f"\n  [{i}/{len(MEASURES)}] {m.upper()}")

        vs_path = os.path.join(SCRIPT_DIR, "data", f"{m}-valuesets.json")

        # Clinical data (the 485 dqm-content test patients — skip for existing Aidbox installs)
        if not skip_clinical:
            cd_path = os.path.join(SCRIPT_DIR, "data", f"{m}-clinical-data.json")
            load_bundle(cd_path, "Clinical data")

        # Concepts: flatten this measure's ValueSets (already in far.valueset from the
        # package) into the `concepts` view.
        new = populate_concepts(vs_path)
        if new:
            print(f"  OK Concepts — {new} codes")

    # Materialize ViewDefinitions (after data loaded)
    print("\n[5/6] Materializing ViewDefinitions → sof.* tables...")
    # Drop wrapper views (CASCADE) first — $materialize re-creates the sof.* tables
    # via DROP TABLE, which Postgres refuses while wrapper views depend on them.
    # IF EXISTS makes this a no-op on first run.
    for view in WRAPPER_VIEWS:
        try:
            run_sql(f"DROP VIEW IF EXISTS {view} CASCADE")
        except Exception as e:
            print(f"  WARN: DROP VIEW {view} — {str(e)[:80]}")
    mat_body = json.dumps({"resourceType": "Parameters", "parameter": [{"name": "type", "valueCode": "table"}]}).encode()
    # $materialize can run long on large data — no client timeout (Aidbox has no POST timeout).
    # On failure we surface a targeted hint and raise (no silent fallback to legacy views).
    for vd_id in vd_ids:
        # Package install re-keys VDs to a far-assigned GUID id (url preserved).
        # $materialize is addressed by id, so resolve slug -> runtime id by url.
        runtime_id = resolve_vd_id(vd_id)
        print(f"  materializing {vd_id} (id={runtime_id})...")
        try:
            req = urllib.request.Request(f"{BASE_URL}/fhir/ViewDefinition/{runtime_id}/$materialize", method="POST",
                data=mat_body)
            req.add_header("Authorization", f"Basic {auth_header()}")
            req.add_header("Content-Type", "application/json")
            urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            body = e.read()[:300].decode(errors='replace') if e.fp else ''
            code = e.code
            print(f"  ERROR: $materialize failed for {vd_id}: HTTP {code}")
            if body:
                print(f"    {body[:200]}")
            if code == 504 or 'Gateway Time-out' in body:
                print(f"  → nginx proxy_read_timeout is shorter than the materialize runtime. Bump:")
                print(f"      proxy_read_timeout 1800s;  proxy_send_timeout 1800s;")
            elif code == 404:
                print(f"  → VD not found. Is the FHIR package installed? (init.json runs")
                print(f"    $fhir-package-install at boot; build it: python3 scripts/build_fhir_package.py)")
                print(f"    $materialize also requires Aidbox 2508+. Check: curl -s {BASE_URL}/health | jq -r '.about.version'")
            elif 'multiple values found' in body:
                print(f"  → A resource has multiple matching values for a single-value FHIRPath; the")
                print(f"    ViewDefinition needs .first() or a stricter filter — see viewdefinitions/{vd_id}.json.")
            elif 'depend on it' in body:
                print(f"  → Wrapper view dependency conflict. Pull latest and re-run.")
            raise
    print(f"  OK — {len(vd_ids)} tables materialized")
    print("[6/6] Creating indexes + wrapper views + shared functions...")
    # 03-sof-indexes.sql can take 5-20 min on production-sized observation tables
    # (10M+ rows). CREATE INDEX without CONCURRENTLY (not available via /$sql since
    # it wraps statements in transactions), and ANALYZE on big tables, both eat time.
    execute_sql_file(os.path.join(SCRIPT_DIR, "sql", "03-sof-indexes.sql"), "sof indexes", timeout=1800)
    execute_sql_file(os.path.join(SCRIPT_DIR, "sql", "01-wrapper-views.sql"), "Wrapper views")
    execute_sql_file(os.path.join(SCRIPT_DIR, "sql", "02-shared-exclusions.sql"), "Shared exclusions")

    # Lineage normalizer nodes: project each wrapper view as a SQLQuery Library so
    # downstream relatedArtifact chains read normalized columns. Rebuilt from
    # pg_get_viewdef after the wrapper views, so each node matches its view.
    print("Building lineage normalizer Library nodes...")
    sys.path.insert(0, os.path.join(SCRIPT_DIR, "scripts"))
    from build_normalizer_libraries import build_normalizers
    n_ok, n_total = build_normalizers(BASE_URL, f"Basic {auth_header()}", verbose=False)
    print(f"  OK — {n_ok}/{n_total} normalizer nodes")

    # Summary
    try:
        patients = run_sql("SELECT COUNT(*) AS n FROM patient")
        concepts = run_sql("SELECT COUNT(*) AS n FROM concepts")
        print(f"\n{'='*50}")
        print(f"  Setup complete!")
        print(f"  Patients: {patients[0]['n']}")
        print(f"  Concepts: {concepts[0]['n']}")
        print(f"  Measures: {len(MEASURES)}")
        print(f"\n  Demo: python3 -m http.server 3000 → http://localhost:3000/demo/app.html")
        print(f"  API:  POST {BASE_URL}/Measure/$evaluate-measure")
        print(f"{'='*50}")
    except Exception:
        print("\nSetup complete!")


if __name__ == "__main__":
    main()
