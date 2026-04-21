#!/usr/bin/env python3
"""Build a comprehensive init-bundle for the measure-evaluate sample.

Aggregates:
  - the App resource (custom operation routing),
  - every unique ValueSet referenced by the 12 measures, deduplicated.

Outputs to init.json in the repository root. Aidbox picks this file up via
BOX_INIT_BUNDLE on startup, so after `docker compose up` every measure
ValueSet is addressable via `GET /ValueSet` and `$expand` without running
setup.py first.

Usage:
    python3 scripts/build_init_bundle.py
"""
from __future__ import annotations
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT = ROOT / "init.json"

# 1. The single App resource that registers Measure/$evaluate-measure with Aidbox.
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


def collect_valueset_entries() -> list[dict]:
    """Walk data/*-valuesets.json, return unique ValueSets by canonical URL.

    When the same URL appears in multiple files, the first occurrence wins
    (they should be identical — we preload from the same NLM expansions).
    """
    vs_files = sorted(DATA_DIR.glob("*-valuesets.json"))
    if not vs_files:
        print(f"ERROR: no *-valuesets.json files under {DATA_DIR}")
        sys.exit(1)

    seen: dict[str, dict] = {}
    for f in vs_files:
        bundle = json.loads(f.read_text())
        for entry in bundle.get("entry", []):
            resource = entry.get("resource", {})
            if resource.get("resourceType") != "ValueSet":
                continue
            url = resource.get("url")
            if not url or url in seen:
                continue
            oid = resource.get("id") or url.rsplit("/", 1)[-1]
            seen[url] = {
                "request": {"method": "PUT", "url": f"/ValueSet/{oid}"},
                "resource": resource,
            }
    return list(seen.values())


def main() -> None:
    vs_entries = collect_valueset_entries()
    bundle = {
        "type": "batch",
        "entry": [APP_ENTRY, *vs_entries],
    }
    OUTPUT.write_text(json.dumps(bundle, indent=2) + "\n")
    size = os.path.getsize(OUTPUT)
    print(f"Wrote {OUTPUT}")
    print(f"  App entries: 1")
    print(f"  ValueSet entries: {len(vs_entries)}")
    print(f"  Size: {size:,} bytes ({size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    main()
