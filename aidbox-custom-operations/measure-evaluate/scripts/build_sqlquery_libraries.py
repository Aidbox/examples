#!/usr/bin/env python3
"""Generate SQL-on-FHIR SQLQuery Library resources from the measure SQL.

For each measure this emits three SQLQuery Libraries (FHIR Library resources on the
SQLQuery profile) into sqlquery/measures/<id>/:
  <id>-summary.json     — cohort totals + score (build_summary_sql shape)
  <id>-per-patient.json — one row per patient with membership flags
  <id>-evidence.json    — per-patient decision chain (when 03-<id>-evidence.sql exists)

Each Library:
  * carries the measure SQL base64'd in content.data (+ readable sql-text extension)
  * declares :period_start / :period_end date parameters (bound at $sqlquery-run)
  * declares relatedArtifact depends-on for every flat/terminology ViewDefinition
    the SQL reads — the lineage graph (measure -> views -> resources). The SQL still
    references the physical relations directly; depends-on is metadata, not routing.

The SQL is taken verbatim from evaluate_measure.build_summary_sql /
build_per_patient_sql (the /$sql-authoring path), with only the two hardcoded MP date
literals swapped for :period_start / :period_end placeholders — a transport change,
not a logic change.

Usage:
  python3 scripts/build_sqlquery_libraries.py                 # all measures -> files
  python3 scripts/build_sqlquery_libraries.py cms130          # one measure
  python3 scripts/build_sqlquery_libraries.py --load --base-url http://localhost:8888
"""
from __future__ import annotations
import argparse, base64, json, os, re, sys, urllib.request

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO_ROOT, "app"))
import evaluate_measure as em

CANONICAL_BASE = "https://health-samurai.io/fhir"
VD_DIR = os.path.join(REPO_ROOT, "viewdefinitions")

MEASURES = ["cms75", "cms124", "cms125", "cms130", "cms131", "cms139",
            "cms143", "cms149", "cms153", "cms155", "cms165", "cms1154"]

# SQL relation name -> ViewDefinition id (for depends-on canonical resolution).
# `concepts` is the wrapper view over sof.concept, declared by the `concept` VD.
RELATION_TO_VD = {
    "patient_flat": "patient-flat", "encounter_flat": "encounter-flat",
    "condition_flat": "condition-flat", "procedure_flat": "procedure-flat",
    "observation_flat": "observation-flat", "observation_bp_flat": "observation-bp-flat",
    "servicerequest_flat": "servicerequest-flat",
    "medicationrequest_flat": "medicationrequest-flat",
    "devicerequest_flat": "devicerequest-flat",
    "concepts": "concept",
}
RELATION_RE = re.compile(r"\b(" + "|".join(RELATION_TO_VD) + r")\b")

# shared_* PL/pgSQL exclusion function -> excl-<name> SQLQuery Library block name.
# When a measure's SQL calls one of these as a LATERAL CTE, the generated Library
# instead declares a depends-on on the excl-<name> Library with a label EQUAL to the
# measure's CTE name — Aidbox injects the exclusion as a leading CTE by that label,
# replacing the removed local CTE definition. The label intentionally collides with
# the measure's CTE name (unlike vd_ labels); the whole point is that the injected
# exclusion CTE substitutes for the inline one.
SHARED_FN_TO_EXCL = {
    "shared_hospice": "hospice",
    "shared_palliative": "palliative",
    "shared_nursing_home": "nursing_home",
    "shared_advanced_illness_frailty": "advanced_illness_frailty",
    "shared_advanced_illness": "advanced_illness",
    "shared_dementia_meds": "dementia_meds",
    "shared_has_frailty": "has_frailty",
}


def rewire_exclusions(sql: str):
    """Replace inline `shared_*` exclusion CTEs with depends-on injection points.

    A measure defines each exclusion as a CTE that wraps a `LATERAL shared_<fn>(...)`
    call, in one of two forms:
        single-line: `<label> AS (SELECT h.* FROM mp, LATERAL shared_<fn>(...) h),`
        multi-line:  `<label> AS (\n ... \n LATERAL shared_<fn>(...) h\n),`
    Removing that whole CTE and declaring `depends-on excl-<label>` with label
    `<label>` makes Aidbox inject the exclusion Library's SQL as a leading CTE named
    `<label>`, which the rest of the measure references unchanged. The exclusion
    Library builds its own `mp` from :period_start/:period_end, so it is
    self-contained.

    Returns (rewired_sql, [label, ...]) — labels in the order they appeared.
    """
    labels = []
    for fn, label in SHARED_FN_TO_EXCL.items():
        cte_re = re.compile(
            r"(?ms)^(?:[ \t]*--[^\n]*\r?\n)?"  # optional annotation comment line above
            + re.escape(label) + r" AS \(.*?LATERAL "
            + re.escape(fn) + r"\(.*?\)[ \t]*h[ \t]*\r?\n?[ \t]*\),[ \t]*\r?\n")
        sql, n = cte_re.subn("", sql)
        if n == 1:
            labels.append(label)
        elif n > 1:
            raise SystemExit(f"multiple {fn} CTE definitions matched — SQL shape changed")
    return sql, labels


def _vd_url_by_id():
    """Map VD id -> canonical url from the ViewDefinition files (source of truth)."""
    out = {}
    for name in os.listdir(VD_DIR):
        if name.endswith(".json"):
            d = json.load(open(os.path.join(VD_DIR, name)))
            out[d["id"]] = d.get("url") or f"{CANONICAL_BASE}/ViewDefinition/{d['id']}"
    return out


def parameterize(sql: str) -> str:
    """Adapt raw measure SQL for a SQLQuery Library that declares depends-on.

    Three transforms, all forced by how Aidbox compiles a SQLQuery with depends-on
    (each dep becomes a leading CTE and Aidbox prepends its own `WITH`, then appends
    this SQL):
      1. Swap the two hardcoded MP date literals for :period_start / :period_end
         (keeps the ::timestamptz cast; builds the timestamp from the :date param).
      2. Strip the leading comment/blank-line block. The appended SQL must begin
         exactly at the CTE continuation; a leading `-- comment` line sitting between
         the injected `WITH dep AS (...)` and our first CTE silently breaks the
         compile (0 rows).
      3. Turn the (now-leading) `WITH mp AS (...)` into a continuation `, mp AS (...)`.
         Without this the query is `WITH dep AS (...) WITH mp AS (...)` — malformed.
    """
    out = sql.replace("'2026-01-01T00:00:00Z'::timestamptz",
                      "((:period_start)::text || 'T00:00:00Z')::timestamptz")
    out = out.replace("'2026-12-31T23:59:59Z'::timestamptz",
                      "((:period_end)::text || 'T23:59:59Z')::timestamptz")
    # 2. strip leading comment/blank lines
    out = re.sub(r"\A(?:[ \t]*--[^\n]*\n|[ \t]*\n)+", "", out)
    # 3. leading WITH -> comma (the injected dep CTEs supply the WITH keyword)
    out2 = re.sub(r"\AWITH\s+", ", ", out, count=1)
    if out2 == out:
        raise SystemExit("SQL does not start with WITH after comment strip — shape changed")
    return out2


def depends_on(sql: str, vd_urls: dict) -> list:
    """One depends-on per distinct flat/terminology relation the SQL reads.

    The label is prefixed `vd_` so it does NOT collide with the physical table name
    the SQL actually queries. Aidbox turns each depends-on into a CTE named by its
    label and rewrites any matching identifier in the SQL to that CTE; a colliding
    label would hijack `patient_flat` etc. and (for the empty `concept` VD) yield 0
    rows. With a non-colliding label the SQL keeps reading the real relations and
    the depends-on is pure lineage metadata.
    """
    vd_ids = sorted({RELATION_TO_VD[r] for r in set(RELATION_RE.findall(sql))})
    return [{"type": "depends-on", "resource": vd_urls[vid],
             "label": "vd_" + vid.replace("-", "_")}
            for vid in vd_ids]


def build_library(measure_id: str, variant: str, sql: str, vd_urls: dict) -> dict:
    lib_id = f"{measure_id}-{variant}"
    param_sql = parameterize(sql)
    if ":period_start" not in param_sql:
        raise SystemExit(f"{measure_id}: MP date literal not found — non-default period?")
    # Replace inline shared_* exclusion CTEs with depends-on injection: the exclusion
    # SQL now comes from the excl-<label> Library, injected as a CTE named <label>.
    param_sql, excl_labels = rewire_exclusions(param_sql)
    related = depends_on(param_sql, vd_urls) + [
        {"type": "depends-on",
         "resource": f"{CANONICAL_BASE}/Library/excl-{label}",
         "label": label}
        for label in excl_labels
    ]
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
        "relatedArtifact": related,
        "content": [{
            "contentType": "application/sql",
            "extension": [{
                "url": "https://sql-on-fhir.org/ig/StructureDefinition/sql-text",
                "valueString": param_sql}],
            "data": base64.b64encode(param_sql.encode()).decode(),
        }],
    }


def _measure_sql_path(measure_id: str) -> str:
    return os.path.join(REPO_ROOT, "sql", "measures", measure_id,
                        f"02-{measure_id}-measure.sql")


def _evidence_fragment_path(measure_id: str) -> str:
    return os.path.join(REPO_ROOT, "sql", "measures", measure_id,
                        f"03-{measure_id}-evidence.sql")


def generate(measure_id: str, vd_urls: dict) -> dict:
    measure_sql = open(_measure_sql_path(measure_id)).read()
    out = {
        "summary": build_library(measure_id, "summary",
                                 em.build_summary_sql(measure_sql), vd_urls),
        "per-patient": build_library(measure_id, "per-patient",
                                     em.build_per_patient_sql(measure_sql), vd_urls),
    }
    # Third variant: <id>-evidence. Population-mode evidence SQL (measure CTE chain
    # + the 03-*-evidence.sql fragment appended). It goes through the SAME
    # parameterize()/rewire_exclusions() transforms via build_library().
    ev_path = _evidence_fragment_path(measure_id)
    if os.path.exists(ev_path):
        fragment = open(ev_path).read()
        evidence_sql = em.build_evidence_sql(measure_sql, fragment, patient_id=None)
        if evidence_sql:
            out["evidence"] = build_library(measure_id, "evidence",
                                            evidence_sql, vd_urls)
    return out


def fhir_put(resource: dict, base_url: str, auth: str):
    req = urllib.request.Request(
        f"{base_url}/fhir/Library/{resource['id']}", method="PUT",
        data=json.dumps(resource).encode())
    req.add_header("Authorization", auth)
    req.add_header("Content-Type", "application/json")
    urllib.request.urlopen(req, timeout=30)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("measures", nargs="*", help="measure ids (default: all)")
    ap.add_argument("--load", action="store_true", help="PUT the Libraries into Aidbox")
    ap.add_argument("--base-url", default="http://localhost:8888")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", default="secret")
    args = ap.parse_args()

    auth = "Basic " + base64.b64encode(f"{args.user}:{args.password}".encode()).decode()
    vd_urls = _vd_url_by_id()
    targets = args.measures or MEASURES

    for m in targets:
        libs = generate(m, vd_urls)
        out_dir = os.path.join(REPO_ROOT, "sqlquery", "measures", m)
        os.makedirs(out_dir, exist_ok=True)
        for variant, lib in libs.items():
            path = os.path.join(out_dir, f"{m}-{variant}.json")
            with open(path, "w") as f:
                json.dump(lib, f, indent=2)
                f.write("\n")
            deps = ",".join(a["label"] for a in lib["relatedArtifact"])
            print(f"  {m}-{variant:11s} deps=[{deps}]")
            if args.load:
                fhir_put(lib, args.base_url, auth)
        if args.load:
            print(f"  {m}: loaded {len(libs)} Libraries")


if __name__ == "__main__":
    main()
