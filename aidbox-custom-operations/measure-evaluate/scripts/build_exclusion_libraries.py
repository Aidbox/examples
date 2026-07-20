#!/usr/bin/env python3
"""Generate SQL-on-FHIR SQLQuery Library resources for the shared exclusions.

Parses sqlquery/shared/exclusions.sql (7 named blocks delimited by `-- @@ <name>`)
and emits one FHIR Library on the SQLQuery profile per block into
sqlquery/shared/excl-<name>.json.

Each exclusion Library:
  * carries the block SQL base64'd in content.data (+ readable sql-text extension)
  * declares :period_start / :period_end date parameters (bound at $sqlquery-run)
  * declares relatedArtifact depends-on for every flat/terminology ViewDefinition
    the block reads (vd_ label convention, non-colliding — pure lineage metadata)

The block SQL is used verbatim; this module only wraps it into the FHIR Library
envelope and derives the depends-on lineage. It shares CANONICAL_BASE /
RELATION_TO_VD / vd-label conventions with build_sqlquery_libraries.

Usage:
  python3 scripts/build_exclusion_libraries.py                 # -> files
  python3 scripts/build_exclusion_libraries.py --load --base-url http://localhost:8888
"""
from __future__ import annotations
import argparse, base64, json, os, re, sys, urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "scripts"))
from build_sqlquery_libraries import (
    CANONICAL_BASE, RELATION_TO_VD, RELATION_RE, _vd_url_by_id, fhir_put,
)

SHARED_OUT_DIR = os.path.join(REPO_ROOT, "sqlquery", "shared")
EXCL_SQL = os.path.join(SHARED_OUT_DIR, "exclusions.sql")

# Exclusion block name -> the shared_* function it replaces (documentation only).
EXCLUSIONS = ["hospice", "palliative", "nursing_home", "advanced_illness_frailty",
              "advanced_illness", "dementia_meds", "has_frailty"]


def parse_blocks(sql: str) -> dict:
    """Split exclusions.sql on `-- @@ <name>` delimiters into {name: body_sql}.

    The body is the text after the delimiter line up to the next delimiter (or EOF),
    stripped of surrounding blank lines. Each body already begins with `, mp AS (...)`
    (a leading CTE continuation) and is used verbatim.
    """
    parts = re.split(r"(?m)^-- @@ (\w+)[ \t]*$", sql)
    out = {}
    for i in range(1, len(parts), 2):
        name = parts[i]
        body = parts[i + 1]
        body = body.strip("\n")
        out[name] = body
    return out


def depends_on(sql: str, vd_urls: dict) -> list:
    """One depends-on per distinct flat/terminology relation the block reads.

    Same vd_-label convention as build_sqlquery_libraries.depends_on: the label is
    prefixed vd_ so it never shadows the physical relation the SQL reads; depends-on
    stays pure lineage metadata.
    """
    vd_ids = sorted({RELATION_TO_VD[r] for r in set(RELATION_RE.findall(sql))})
    return [{"type": "depends-on", "resource": vd_urls[vid],
             "label": "vd_" + vid.replace("-", "_")}
            for vid in vd_ids]


def build_library(name: str, sql: str, vd_urls: dict) -> dict:
    lib_id = f"excl-{name}"
    return {
        "resourceType": "Library",
        "id": lib_id,
        "url": f"{CANONICAL_BASE}/Library/{lib_id}",
        "name": lib_id.replace("-", "_"),
        "status": "active",
        "meta": {"profile": ["https://sql-on-fhir.org/ig/StructureDefinition/SQLQuery"]},
        "type": {"coding": [{
            "system": "https://sql-on-fhir.org/ig/CodeSystem/LibraryTypesCodes",
            "code": "sql-query"}]},
        "parameter": [
            {"name": "period_start", "use": "in", "type": "date"},
            {"name": "period_end", "use": "in", "type": "date"},
        ],
        "relatedArtifact": depends_on(sql, vd_urls),
        "content": [{
            "contentType": "application/sql",
            "extension": [{
                "url": "https://sql-on-fhir.org/ig/StructureDefinition/sql-text",
                "valueString": sql}],
            "data": base64.b64encode(sql.encode()).decode(),
        }],
    }


def generate(vd_urls: dict) -> dict:
    blocks = parse_blocks(open(EXCL_SQL).read())
    missing = set(EXCLUSIONS) - set(blocks)
    if missing:
        raise SystemExit(f"exclusions.sql missing blocks: {sorted(missing)}")
    return {name: build_library(name, blocks[name], vd_urls) for name in EXCLUSIONS}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--load", action="store_true", help="PUT the Libraries into Aidbox")
    ap.add_argument("--base-url", default="http://localhost:8888")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="secret")
    args = ap.parse_args()

    auth = "Basic " + base64.b64encode(f"{args.user}:{args.password}".encode()).decode()
    vd_urls = _vd_url_by_id()
    libs = generate(vd_urls)

    os.makedirs(SHARED_OUT_DIR, exist_ok=True)
    for name, lib in libs.items():
        path = os.path.join(SHARED_OUT_DIR, f"excl-{name}.json")
        with open(path, "w") as f:
            json.dump(lib, f, indent=2)
            f.write("\n")
        deps = ",".join(a["label"] for a in lib["relatedArtifact"])
        print(f"  excl-{name:24s} deps=[{deps}]")
        if args.load:
            fhir_put(lib, args.base_url, auth)
    if args.load:
        print(f"  loaded {len(libs)} exclusion Libraries")


if __name__ == "__main__":
    main()
