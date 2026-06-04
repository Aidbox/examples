#!/usr/bin/env python3
"""Build the init-bundle for the measure-evaluate sample.

Contains only the App resource (custom operation routing for Measure/$evaluate-measure).
Aidbox picks this file up via BOX_INIT_BUNDLE on startup.

ValueSets are NOT pre-loaded here: the SQL measure evaluation uses the `concepts`
table (built by setup.py), not the FHIR ValueSet resources. setup.py loads the
ValueSets (data/*-valuesets.json) when run; there is no consumer of them before that.

Usage:
    python3 scripts/build_init_bundle.py
"""
from __future__ import annotations
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "init.json"

# The single App resource that registers Measure/$evaluate-measure with Aidbox.
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


def main() -> None:
    bundle = {
        "type": "batch",
        "entry": [APP_ENTRY],
    }
    OUTPUT.write_text(json.dumps(bundle, indent=2) + "\n")
    size = os.path.getsize(OUTPUT)
    print(f"Wrote {OUTPUT}")
    print(f"  App entries: 1")
    print(f"  Size: {size:,} bytes")


if __name__ == "__main__":
    main()
