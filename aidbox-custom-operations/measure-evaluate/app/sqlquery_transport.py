"""Run measure logic via the SQL-on-FHIR $sqlquery-run operation.

The calculation SQL is the single source of truth held in Aidbox as SQLQuery
Library resources (sqlquery/<id>-{summary,per-patient,evidence}.json + the shared
sqlquery/excl-*.json exclusions, loaded into Aidbox by the FHIR package). This
module invokes those stored Libraries and returns their rows in the exact shape
evaluate_measure's MeasureReport builders expect -- so the adapter holds NO measure
SQL, only the transport call + row shaping.

Library -> builder-row mapping:
  <id>-summary      -> {ip, den, exc, num[, num_2..]}         (one aggregate row)
  <id>-per-patient  -> {patient_id, in_ip, in_exc, in_num[, in_num_2..]} per patient
  <id>-evidence     -> decision-chain rows (passed through unchanged)
"""
from __future__ import annotations
import base64
import json
import urllib.request


def _auth(user, password):
    return "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()


def _truthy(v):
    return v in (True, "t", "true", 1, "1")


# Canonical url base the SQLQuery Libraries declare (build_sqlquery_libraries.py).
CANONICAL_BASE = "https://health-samurai.io/fhir/Library"
_id_by_url: dict[str, str] = {}  # canonical url -> runtime resource id (cache)


def _resolve_library_id(variant_id, base_url, user, password, timeout=30):
    """Map a Library's canonical url to its runtime resource id.

    A FHIR-package-installed Library is re-keyed to a far-assigned GUID id (the canonical
    `url` is preserved), so it is NOT addressable at Library/<our-id>. We look it up by
    url via search and cache the result. Falls back to <variant_id> when search finds
    nothing (e.g. Libraries loaded by PUT under their stable id -- dev/test)."""
    url = f"{CANONICAL_BASE}/{variant_id}"
    if url in _id_by_url:
        return _id_by_url[url]
    from urllib.parse import quote
    req = urllib.request.Request(
        f"{base_url}/fhir/Library?url={quote(url, safe='')}&_elements=id")
    req.add_header("Authorization", _auth(user, password))
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            bundle = json.loads(resp.read().decode())
        entries = bundle.get("entry", [])
        rid = entries[0]["resource"]["id"] if entries else variant_id
    except Exception:
        rid = variant_id
    _id_by_url[url] = rid
    return rid


def run_library(variant_id, period_start, period_end, base_url, user, password, timeout=120):
    """Resolve <variant_id> (e.g. 'cms130-summary') to its runtime id via canonical url,
    then POST /Library/<id>/$sqlquery-run with the MP params. Returns rows (list[dict])."""
    lib_id = _resolve_library_id(variant_id, base_url, user, password)
    body = {
        "resourceType": "Parameters",
        "parameter": [
            {"name": "_format", "valueCode": "json"},
            {"name": "parameters", "resource": {
                "resourceType": "Parameters",
                "parameter": [
                    {"name": "period_start", "valueDate": period_start},
                    {"name": "period_end", "valueDate": period_end},
                ]}},
        ],
    }
    req = urllib.request.Request(
        f"{base_url}/fhir/Library/{lib_id}/$sqlquery-run",
        method="POST", data=json.dumps(body).encode())
    req.add_header("Authorization", _auth(user, password))
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        b = resp.read().decode()
        return json.loads(b) if b.strip() else []


def summary_row(measure_id, period_start, period_end, base_url, user, password):
    """The <id>-summary aggregate row (ip/den/exc/num[/num_N]), as the builders want it.

    build_summary_report SUMS a list of rows, so wrapping the single aggregate row in a
    one-element list yields the same totals. Returns [] if no data.
    """
    rows = run_library(f"{measure_id}-summary", period_start, period_end,
                       base_url, user, password)
    if not rows:
        return []
    r = rows[0]
    out = {"ip": r["ip"], "den": r["den"], "exc": r["exc"], "num": r["num"]}
    for k, v in r.items():
        if k.startswith("num_"):  # multi-numerator measures
            out[k] = v
    return [out]


def per_patient_rows(measure_id, period_start, period_end, base_url, user, password):
    """<id>-per-patient membership rows normalized to builder shape.

    Emits {patient_id, ip, den, exc, num[, num_N]} with booleans -> 0/1 ints.
    den mirrors ip (a patient in the initial population is in the denominator).
    """
    rows = run_library(f"{measure_id}-per-patient", period_start, period_end,
                       base_url, user, password)
    out = []
    for r in rows:
        ip = 1 if _truthy(r["in_ip"]) else 0
        rec = {"patient_id": r["patient_id"], "ip": ip, "den": ip,
               "exc": 1 if _truthy(r["in_exc"]) else 0,
               "num": 1 if _truthy(r["in_num"]) else 0}
        for k, v in r.items():
            if k.startswith("in_num_"):  # in_num_2 -> num_2
                rec[k.replace("in_", "")] = 1 if _truthy(v) else 0
        out.append(rec)
    return out


def evidence_rows(measure_id, period_start, period_end, base_url, user, password):
    """<id>-evidence decision-chain rows, passed through unchanged (or None if absent)."""
    try:
        return run_library(f"{measure_id}-evidence", period_start, period_end,
                           base_url, user, password)
    except Exception:
        return None
