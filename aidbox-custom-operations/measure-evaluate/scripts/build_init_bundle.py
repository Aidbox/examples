#!/usr/bin/env python3
"""Build the static init-bundle (init.json) for the measure-evaluate sample.

Two entries, both static:
  1. the App resource that registers Measure/$evaluate-measure with Aidbox, and
  2. one `$fhir-package-install` that installs the generated FHIR NPM package
     (terminology + ViewDefinitions + SQLQuery Libraries) at boot.

Aidbox picks this file up via BOX_INIT_BUNDLE on startup. The package .tgz itself is
built separately by scripts/build_fhir_package.py and mounted at
/srv/aidbox-fhir-packages (see docker-compose.yml).

The package filename uses '-' (not '#') between name and version: a '#' in a file://
URL is parsed as a fragment and truncates the path.

Usage:
    python3 scripts/build_init_bundle.py
"""
from __future__ import annotations
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


def main() -> None:
    bundle = {
        "resourceType": "Bundle",
        "type": "batch",
        "entry": [APP_ENTRY, PACKAGE_ENTRY],
    }
    OUTPUT.write_text(json.dumps(bundle, indent=2) + "\n")
    size = os.path.getsize(OUTPUT)
    print(f"Wrote {OUTPUT}")
    print(f"  Entries: App route + $fhir-package-install")
    print(f"  Package: {PACKAGE_FILE}")
    print(f"  Size: {size:,} bytes")


if __name__ == "__main__":
    main()
