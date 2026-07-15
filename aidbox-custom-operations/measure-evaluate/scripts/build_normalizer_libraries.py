#!/usr/bin/env python3
"""Project each wrapper flat view as a lineage-facing SQLQuery Library.

The wrapper views (sql/01-wrapper-views.sql) are the single source of date and
polymorphic normalization over the sof.* materialized tables. Measures read them
as plain Postgres relations (FROM condition_flat). Aidbox lineage chains
(relatedArtifact: depends-on) substitute declarable artifacts, not Postgres views,
so this script projects each wrapper view as a SQLQuery Library (a declarable node
with a canonical url) whose SQL is the view's own definition. A downstream lineage
node can then depend on the normalizer and read the normalized columns (onset_date,
effective_start, …) without replicating parse_fhir_datetime.

Single source: each Library's SQL is `pg_get_viewdef(<view>)` — the view's exact
definition — so the node never drifts from the view. setup.py rebuilds these after
the wrapper views; run standalone after changing the views.

Requires Aidbox's SQLQuery run operation (present in 2606.2, the version this
sample pins; absent in 2603): POST /fhir/Library/{id}/$sqlquery-run.

Usage:
    python3 scripts/build_normalizer_libraries.py
    python3 scripts/build_normalizer_libraries.py --base-url http://localhost:8888
    python3 scripts/build_normalizer_libraries.py --bundle out.json   # also write a bundle
"""
import argparse
import base64
import json
import sys
import urllib.error
import urllib.request

DEFAULT_BASE_URL = "http://localhost:8888"
URL_PREFIX = "http://measure-evaluate.local/Library/norm-"
SQLQUERY_PROFILE = "http://aidbox.app/StructureDefinition/SQLQuery"


def _req(base, method, path, auth, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(base + path, data=data, method=method,
                               headers={"Authorization": auth, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def sql(base, auth, query):
    _, rows = _req(base, "POST", "/$sql", auth, [query])
    return rows


def library_for(view, viewdef):
    node_id = "norm-" + view.replace("_", "-")
    return {
        "resourceType": "Library",
        "id": node_id,
        "url": URL_PREFIX + view,
        "status": "active",
        "name": "norm_" + view,
        "type": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/library-type", "code": "sql-query"}]},
        "meta": {"profile": [SQLQUERY_PROFILE]},
        "content": [{"contentType": "application/sql", "data": base64.b64encode(viewdef.encode()).decode()}],
    }


def build_normalizers(base_url, auth, bundle_path=None, verbose=True):
    """Rebuild one SQLQuery-Library normalizer node per wrapper *_flat view.

    PUT is create-or-replace on a deterministic id/url (norm-<view>), so re-running
    rebuilds the same nodes with no duplicates. Returns (ok, total).
    """
    views = [r["viewname"] for r in sql(
        base_url, auth,
        "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname LIKE '%\\_flat' ORDER BY viewname")]
    if not views:
        if verbose:
            print("No wrapper *_flat views found — run setup.py first.")
        return 0, 0

    bundle = {"resourceType": "Bundle", "type": "collection", "entry": []}
    ok = 0
    for v in views:
        viewdef = sql(base_url, auth, f"SELECT pg_get_viewdef('{v}') AS d")[0]["d"].strip().rstrip(";")
        lib = library_for(v, viewdef)
        bundle["entry"].append({"resource": lib})
        st, resp = _req(base_url, "PUT", f"/fhir/Library/{lib['id']}", auth, lib)
        if st not in (200, 201):
            issue = resp.get("issue", [{}])[0]
            if verbose:
                print(f"  x {v}: PUT {st} — {issue.get('diagnostics') or issue.get('expression')}")
            continue
        if verbose:
            # smoke: node runs and returns rows
            _, res = _req(base_url, "POST", f"/fhir/Library/{lib['id']}/$sqlquery-run", auth,
                          {"resourceType": "Parameters", "parameter": [{"name": "_format", "valueCode": "json"}]})
            n = len(res) if isinstance(res, list) else "ERR"
            print(f"  ok {lib['url']}  rows={n}")
        ok += 1

    if bundle_path:
        with open(bundle_path, "w") as f:
            json.dump(bundle, f, indent=2)
        if verbose:
            print(f"bundle written: {bundle_path}")
    return ok, len(views)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL)
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="secret")
    ap.add_argument("--bundle", help="write the generated Library bundle to this file")
    args = ap.parse_args()
    auth = "Basic " + base64.b64encode(f"{args.user}:{args.password}".encode()).decode()

    ok, total = build_normalizers(args.base_url, auth, bundle_path=args.bundle)
    print(f"\n{ok}/{total} normalizer nodes loaded.")
    sys.exit(0 if total and ok == total else 1)


if __name__ == "__main__":
    main()
