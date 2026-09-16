#!/usr/bin/env python3
"""Build the init-bundle (init.json) for the measure-evaluate sample.

Entries, in order:
  1. the App resource that registers Measure/$evaluate-measure with Aidbox,
  2. one `$fhir-package-install` that installs the generated FHIR NPM package
     (terminology + ViewDefinitions + SQLQuery Libraries) at boot, and
  3. the demo clinical data from data/*-clinical-data.json, so a fresh box comes
     up with patients already loaded (omit with --no-demo-data).

The bundle is a `batch`, not a `transaction`: entries are applied independently,
so a resource Aidbox rejects (two of the sample resources fail validation) does
not sink the rest of the load.

Aidbox picks this file up via BOX_INIT_BUNDLE on startup. The package .tgz itself is
built separately by scripts/build_fhir_package.py and mounted at
/srv/aidbox-fhir-packages (see docker-compose.yml).

The package filename uses '-' (not '#') between name and version: a '#' in a file://
URL is parsed as a fragment and truncates the path.

Usage:
    python3 scripts/build_init_bundle.py
"""
from __future__ import annotations
import argparse
import glob
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "init.json"

PACKAGE_NAME = "healthsamurai.measure-evaluate"
PACKAGE_VERSION = "0.1.0"
PACKAGE_FILE = f"file:///srv/aidbox-fhir-packages/{PACKAGE_NAME}-{PACKAGE_VERSION}.tgz"

# The App resource that registers Measure/$evaluate-measure with Aidbox.
APP_ENTRY = {
    "request": {"method": "PUT", "url": "/App/com.sql.evaluate.app"},
    "resource": {
        "resourceType": "App",
        "type": "app",
        "apiVersion": 1,
        "endpoint": {
            "url": "http://sql-evaluate-app:8090",
            "type": "http-rpc",
            "secret": "mysecret",
        },
        "operations": {
            "measure-evaluate": {
                "path": ["Measure", "$evaluate-measure"],
                "method": "POST",
            },
            "measure-evaluate-get": {
                "path": ["Measure", "$evaluate-measure"],
                "method": "GET",
            },
        },
    },
}

# Install the generated FHIR package (a single file:// param, NO name@version param).
PACKAGE_ENTRY = {
    "request": {"method": "POST", "url": "$fhir-package-install"},
    "resource": {
        "resourceType": "Parameters",
        "parameter": [
            {"name": "package", "valueString": PACKAGE_FILE},
        ],
    },
}


def collect_demo_data() -> list[dict]:
    """Entries from every data/*-clinical-data.json bundle.

    Each source entry already carries its own PUT request, so they merge in as-is
    and stay idempotent across reboots.
    """
    entries: list[dict] = []
    for path in sorted(glob.glob(str(ROOT / "data" / "*-clinical-data.json"))):
        bundle = json.loads(Path(path).read_text())
        for entry in bundle.get("entry", []):
            if entry.get("resource") and entry.get("request"):
                entries.append(entry)
    return entries


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--no-demo-data", action="store_true",
                    help="omit the sample patients (for an Aidbox with real data)")
    args = ap.parse_args()

    entries = [APP_ENTRY, PACKAGE_ENTRY]
    demo = [] if args.no_demo_data else collect_demo_data()
    entries.extend(demo)

    bundle = {
        "resourceType": "Bundle",
        "type": "batch",
        "entry": entries,
    }
    OUTPUT.write_text(json.dumps(bundle, indent=2) + "\n")
    size = os.path.getsize(OUTPUT)
    print(f"Wrote {OUTPUT}")
    print(f"  Entries: App route + $fhir-package-install"
          + (f" + {len(demo)} demo resources" if demo else ""))
    print(f"  Package: {PACKAGE_FILE}")
    print(f"  Size: {size:,} bytes")


if __name__ == "__main__":
    main()
