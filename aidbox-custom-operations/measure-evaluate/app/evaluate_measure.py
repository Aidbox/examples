#!/usr/bin/env python3
"""
Evaluate a FHIR Measure via SQL and return a MeasureReport.

Implements Measure/$evaluate semantics: takes measureUrl, subject, period,
runs the measure SQL via Aidbox $sql, and returns a FHIR MeasureReport.

Usage:
    # Individual report for one patient (default period: 2026)
    python3 app/evaluate_measure.py --measure cms130 --subject Patient/abc123

    # Custom measurement period
    python3 app/evaluate_measure.py --measure cms130 --subject Patient/abc123 \
        --period-start 2025-01-01 --period-end 2025-12-31

    # All patients (summary-style, returns list)
    python3 app/evaluate_measure.py --measure cms130

    # Output to file
    python3 app/evaluate_measure.py --measure cms130 --subject Patient/abc123 -o report.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
import base64
from datetime import datetime, timezone

_FHIR_ID_RE = re.compile(r'^[A-Za-z0-9\-.]{1,64}$')


def _sanitize_patient_id(patient_id: str) -> str:
    """Strip Patient/ prefix and validate as a FHIR resource ID."""
    pid = patient_id.replace("Patient/", "")
    if not _FHIR_ID_RE.match(pid):
        raise ValueError(f"Invalid patient ID: {pid}")
    return pid

REPO_ROOT = os.environ.get('REPO_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_BASE_URL = "http://localhost:8888"
DEFAULT_USER = "root"
DEFAULT_PASS = "secret"
DEFAULT_PERIOD_START = "2026-01-01"
DEFAULT_PERIOD_END = "2026-12-31"

# Single source of truth: service/measures-registry.json
_registry_path = os.path.join(REPO_ROOT, "service", "measures-registry.json")
with open(_registry_path) as _f:
    MEASURES = json.load(_f)


def run_sql(sql: str, base_url: str, user: str, password: str) -> list:
    creds = base64.b64encode(f"{user}:{password}".encode()).decode()
    req = urllib.request.Request(
        f"{base_url}/$sql",
        method="POST",
        data=json.dumps([sql]).encode(),
    )
    req.add_header("Authorization", f"Basic {creds}")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=60)
    body = resp.read().decode()
    if not body.strip():
        return []
    return json.loads(body)


def parameterize_sql(sql: str, period_start: str, period_end: str) -> str:
    """Replace hardcoded measurement period with provided dates.

    Also recalculates lb_start (Look Back Period start = MP start - 2 years)
    used by CMS1154 and potentially other measures.
    """
    from datetime import datetime, timedelta
    sql = sql.replace(
        "'2026-01-01T00:00:00Z'",
        f"'{period_start}T00:00:00Z'"
    )
    sql = sql.replace(
        "'2026-12-31T23:59:59Z'",
        f"'{period_end}T23:59:59Z'"
    )
    # Recalculate lb_start (MP start - 2 years) for measures with lookback periods
    start_dt = datetime.fromisoformat(period_start)
    lb_start = start_dt.replace(year=start_dt.year - 2).strftime('%Y-%m-%d')
    sql = sql.replace(
        "'2024-01-01T00:00:00Z'::timestamptz AS lb_start",
        f"'{lb_start}T00:00:00Z'::timestamptz AS lb_start"
    )
    return sql


def build_evidence_sql(measure_sql: str, evidence_sql_fragment: str,
                       patient_id: str | None) -> str | None:
    """Build full evidence SQL by appending evidence CTEs to measure CTEs.

    The evidence SQL fragment (03-*-evidence.sql) contains additional CTEs
    and a final SELECT. It must be appended after the last CTE of the
    measure SQL (before the final aggregate SELECT).
    """
    # Find the final SELECT to get CTEs only
    idx = measure_sql.rfind("\nSELECT\n    COUNT(*)")
    if idx == -1:
        idx = measure_sql.rfind("\nSELECT\n    count(*)")
    if idx == -1:
        idx = measure_sql.rfind("\nSELECT")
    if idx == -1:
        return None

    ctes = measure_sql[:idx]

    # Add comma after last CTE closing paren
    cte_lines = ctes.rstrip().splitlines()
    for i in range(len(cte_lines) - 1, -1, -1):
        stripped = cte_lines[i].rstrip()
        if stripped.endswith(")"):
            cte_lines[i] = stripped + ","
            break

    full_sql = "\n".join(cte_lines) + "\n" + evidence_sql_fragment

    # Filter to single patient if provided
    if patient_id:
        pid = _sanitize_patient_id(patient_id)
        full_sql = full_sql.rstrip().rstrip(";")
        # Add or replace WHERE clause for patient filter
        if "WHERE mr.patient_id" not in full_sql:
            # Insert before ORDER BY
            order_idx = full_sql.rfind("ORDER BY")
            if order_idx != -1:
                full_sql = (full_sql[:order_idx]
                            + f"WHERE mr.patient_id = '{pid}'\n"
                            + full_sql[order_idx:])
        full_sql += ";"

    return full_sql


def build_patient_sql(measure_sql: str, patient_id: str | None) -> str:
    """Convert aggregate measure SQL to patient-level query.

    Replaces the final SELECT COUNT(*) with a patient-level SELECT,
    optionally filtered to a single patient.
    """
    # Find where the final SELECT starts
    idx = measure_sql.rfind("\nSELECT\n    COUNT(*)")
    if idx == -1:
        idx = measure_sql.rfind("\nSELECT\n    count(*)")
    if idx == -1:
        # Try alternative: SELECT with measure_score
        idx = measure_sql.rfind("\nSELECT")

    ctes = measure_sql[:idx]

    patient_filter = ""
    if patient_id:
        pid = _sanitize_patient_id(patient_id)
        patient_filter = f"\n    WHERE ap.patient_id = '{pid}'"

    # Detect multi-group numerators (numerator_2, numerator_3, ...)
    extra_nums = []
    for i in range(2, 10):
        if f"numerator_{i}" in ctes:
            extra_nums.append(i)

    extra_select = ""
    extra_join = ""
    for i in extra_nums:
        extra_select += f",\n    CASE WHEN n{i}.patient_id IS NOT NULL THEN 1 ELSE 0 END AS num_{i}"
        extra_join += f"\nLEFT JOIN numerator_{i} n{i} ON n{i}.patient_id = ap.patient_id"

    patient_sql = (
        ctes
        + f"""
SELECT ap.patient_id,
    CASE WHEN ip.patient_id IS NOT NULL THEN 1 ELSE 0 END AS ip,
    CASE WHEN ip.patient_id IS NOT NULL THEN 1 ELSE 0 END AS den,
    CASE WHEN ip.patient_id IS NOT NULL AND de.patient_id IS NOT NULL THEN 1 ELSE 0 END AS exc,
    CASE WHEN ip.patient_id IS NOT NULL AND de.patient_id IS NULL AND n.patient_id IS NOT NULL THEN 1 ELSE 0 END AS num{extra_select}
FROM (SELECT id AS patient_id FROM patient_flat) ap
LEFT JOIN initial_population ip ON ip.patient_id = ap.patient_id
LEFT JOIN denominator_exclusion de ON de.patient_id = ap.patient_id
LEFT JOIN numerator n ON n.patient_id = ap.patient_id{extra_join}"""
        + patient_filter
        + "\nORDER BY ap.patient_id;"
    )
    return patient_sql


CQF_CRITERIA_REF = "http://hl7.org/fhir/StructureDefinition/cqf-criteriaReference"


def build_evaluated_resources(evidence_rows: list[dict]) -> list[dict]:
    """Build evaluatedResource array from evidence SQL results.

    Uses the standard cqf-criteriaReference extension to link each
    resource to the population(s) it satisfies. All references are
    real FHIR resource IDs that exist in Aidbox.

    Evidence SQL columns used:
    - ip_resource_type, ip_resource_id: qualifying encounter (IP + denominator)
    - resource_type, resource_id: numerator triggering resource
    - exc_resource_type, exc_resource_id: exclusion triggering resource
    - exclusion_pathway: exclusion CTE name (fallback if no resource)
    """
    # Group by (resource_type, resource_id) -> set of populations
    resource_map: dict[tuple[str, str], set[str]] = {}

    for row in evidence_rows:
        # IP evidence -- qualifying encounters
        ip_rt = row.get("ip_resource_type")
        ip_rid = row.get("ip_resource_id")
        if ip_rt and ip_rid:
            key = (ip_rt, ip_rid)
            resource_map.setdefault(key, set())
            resource_map[key].add("initial-population")
            resource_map[key].add("denominator")

        # Numerator evidence
        rt = row.get("resource_type")
        rid = row.get("resource_id")
        if rt and rid:
            key = (rt, rid)
            resource_map.setdefault(key, set())
            resource_map[key].add("numerator")

        # Exclusion evidence -- real resource reference
        exc_rt = row.get("exc_resource_type")
        exc_rid = row.get("exc_resource_id")
        if exc_rt and exc_rid:
            key = (exc_rt, exc_rid)
            resource_map.setdefault(key, set())
            resource_map[key].add("denominator-exclusion")
        elif row.get("exclusion_pathway"):
            # Fallback: no specific resource, use pathway name as display
            key = ("_exclusion", row["exclusion_pathway"])
            resource_map.setdefault(key, set())
            resource_map[key].add("denominator-exclusion")

    # Build FHIR evaluatedResource array
    evaluated = []
    for (rt, rid), populations in resource_map.items():
        extensions = [
            {"url": CQF_CRITERIA_REF, "valueString": pop}
            for pop in sorted(populations)
        ]
        if rt == "_exclusion":
            evaluated.append({
                "extension": extensions,
                "display": f"Exclusion: {rid}",
            })
        else:
            evaluated.append({
                "extension": extensions,
                "reference": f"{rt}/{rid}",
            })
    return evaluated


def _build_group_entry(ip: int, den: int, exc: int, num: int, exc_type: str) -> dict:
    """Build a single FHIR MeasureReport group entry."""
    return {
        "population": [
            {
                "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": "initial-population", "display": "Initial Population"}]},
                "count": ip,
            },
            {
                "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": "denominator", "display": "Denominator"}]},
                "count": den,
            },
            {
                "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": exc_type, "display": exc_type.replace("-", " ").title()}]},
                "count": exc,
            },
            {
                "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": "numerator", "display": "Numerator"}]},
                "count": num,
            },
        ],
        "measureScore": {
            "value": round(num / max(den - exc, 1), 4) if den > 0 else None
        },
    }


def build_measure_report(
    patient_result: dict,
    measure_info: dict,
    period_start: str,
    period_end: str,
    exc_type: str = "denominator-exclusion",
    evidence_rows: list[dict] | None = None,
) -> dict:
    """Build a FHIR MeasureReport from SQL result row.

    Supports multi-group measures: if patient_result contains num_2, num_3, etc.,
    additional group entries are generated (shared IP/Den/Exc, different numerator).
    """
    ip = patient_result["ip"]
    den = patient_result["den"]
    exc = patient_result["exc"]

    groups = [_build_group_entry(ip, den, exc, patient_result["num"], exc_type)]

    # Add extra groups for multi-rate measures
    for i in range(2, 10):
        num_key = f"num_{i}"
        if num_key in patient_result:
            groups.append(_build_group_entry(ip, den, exc, patient_result[num_key], exc_type))

    report = {
        "resourceType": "MeasureReport",
        "status": "complete",
        "type": "individual",
        "measure": measure_info["canonical"],
        "subject": {"reference": f"Patient/{patient_result['patient_id']}"},
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
        "period": {
            "start": f"{period_start}T00:00:00+00:00",
            "end": f"{period_end}T23:59:59+00:00",
        },
        "group": groups,
    }
    # Add evaluatedResource if evidence is available
    if evidence_rows:
        evaluated = build_evaluated_resources(evidence_rows)
        if evaluated:
            report["evaluatedResource"] = evaluated
    return report


def build_summary_report(
    results: list[dict],
    measure_info: dict,
    period_start: str,
    period_end: str,
    exc_type: str = "denominator-exclusion",
) -> dict:
    """Build a summary MeasureReport from all patient results."""
    ip_sum = sum(r["ip"] for r in results)
    den_sum = sum(r["den"] for r in results)
    exc_sum = sum(r["exc"] for r in results)
    num_sum = sum(r["num"] for r in results)
    eligible = max(den_sum - exc_sum, 1) if den_sum > 0 else 1
    score = round(num_sum / eligible, 4) if den_sum > 0 else None

    return {
        "resourceType": "MeasureReport",
        "status": "complete",
        "type": "summary",
        "measure": measure_info["canonical"],
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
        "period": {
            "start": f"{period_start}T00:00:00+00:00",
            "end": f"{period_end}T23:59:59+00:00",
        },
        "group": [
            {
                "population": [
                    {
                        "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": "initial-population"}]},
                        "count": ip_sum,
                    },
                    {
                        "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": "denominator"}]},
                        "count": den_sum,
                    },
                    {
                        "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": exc_type}]},
                        "count": exc_sum,
                    },
                    {
                        "code": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/measure-population", "code": "numerator"}]},
                        "count": num_sum,
                    },
                ],
                "measureScore": {"value": score} if score is not None else {},
            }
        ],
    }


def build_bundle(reports: list[dict]) -> dict:
    """Wrap MeasureReport(s) in a FHIR Bundle."""
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "total": len(reports),
        "entry": [{"resource": r} for r in reports],
    }


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate a FHIR Measure via SQL -> MeasureReport"
    )
    parser.add_argument(
        "--measure",
        required=True,
        help="Measure ID (e.g., cms130) or canonical URL",
    )
    parser.add_argument(
        "--subject",
        help="Patient reference (e.g., Patient/abc123). Omit for all patients.",
    )
    parser.add_argument("--period-start", default=DEFAULT_PERIOD_START)
    parser.add_argument("--period-end", default=DEFAULT_PERIOD_END)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--user", default=DEFAULT_USER)
    parser.add_argument("--password", default=DEFAULT_PASS)
    parser.add_argument(
        "--report-type",
        choices=["individual", "summary"],
        default="individual",
        help="Report type: individual (per patient) or summary (aggregate)",
    )
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    args = parser.parse_args()

    # Resolve measure
    measure_id = args.measure.lower()
    if measure_id not in MEASURES:
        print(f"Unknown measure: {measure_id}. Available: {', '.join(MEASURES.keys())}")
        sys.exit(1)

    measure_info = MEASURES[measure_id]
    sql_path = os.path.join(REPO_ROOT, measure_info["sql"])

    if not os.path.exists(sql_path):
        print(f"SQL file not found: {sql_path}")
        sys.exit(1)

    # Read and parameterize SQL
    with open(sql_path) as f:
        measure_sql = f.read()

    measure_sql = parameterize_sql(measure_sql, args.period_start, args.period_end)
    patient_sql = build_patient_sql(measure_sql, args.subject)

    # Execute
    results = run_sql(patient_sql, args.base_url, args.user, args.password)

    if not results:
        print("No results returned. Is data loaded in Aidbox?", file=sys.stderr)
        sys.exit(1)

    # Build MeasureReport(s)
    exc_type = measure_info.get("exc_type", "denominator-exclusion")

    if args.report_type == "summary":
        summary = build_summary_report(results, measure_info, args.period_start, args.period_end, exc_type)
        bundle = build_bundle([summary])
    else:
        reports = [
            build_measure_report(r, measure_info, args.period_start, args.period_end, exc_type)
            for r in results
        ]
        bundle = build_bundle(reports)

    # Output
    output = json.dumps(bundle, indent=2)
    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Written to {args.output} ({len(reports)} report(s))")
    else:
        print(output)


if __name__ == "__main__":
    main()
