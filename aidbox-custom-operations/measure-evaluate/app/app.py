#!/usr/bin/env python3
"""
SQL-based Measure/$evaluate — Aidbox custom operation handler.

Receives HTTP-RPC requests from Aidbox for POST /Measure/{measureId}/$evaluate,
executes the measure SQL via $sql, and returns a FHIR MeasureReport.
"""

import json
import os
import sys

from flask import Flask, request, jsonify

# Import core logic from evaluate_measure.py
# In Docker: /app/app/evaluate_measure.py; locally: same directory
REPO_ROOT = os.environ.get('REPO_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO_ROOT, 'app'))
from evaluate_measure import (
    MEASURES,
    parameterize_sql,
    build_patient_sql,
    build_evidence_sql,
    build_measure_report,
    build_summary_report,
    run_sql,
)

app = Flask(__name__)

AIDBOX_URL = os.environ.get('AIDBOX_URL', 'http://localhost:8888')
AIDBOX_USER = os.environ.get('AIDBOX_USER', 'root')
AIDBOX_PASS = os.environ.get('AIDBOX_PASS', 'secret')

# Cache for Measure resource metadata (read from Aidbox once)
_measure_metadata_cache = {}


def fetch_measure_metadata(measure_id: str) -> dict | None:
    """Fetch Measure resource from Aidbox and extract DEQM-relevant metadata.

    Returns dict with: version, scoring, improvementNotation, publisher, group_id.
    Caches results to avoid repeated Aidbox calls.
    """
    if measure_id in _measure_metadata_cache:
        return _measure_metadata_cache[measure_id]

    measure_info = MEASURES.get(measure_id, {})
    # Derive FHIR Measure resource ID from canonical URL
    canonical = measure_info.get('canonical', '')
    fhir_id = canonical.rsplit('/', 1)[-1] if '/' in canonical else None
    if not fhir_id:
        return None

    try:
        import urllib.request
        import base64
        creds = base64.b64encode(f"{AIDBOX_USER}:{AIDBOX_PASS}".encode()).decode()
        req = urllib.request.Request(f"{AIDBOX_URL}/fhir/Measure/{fhir_id}")
        req.add_header('Authorization', f'Basic {creds}')
        resp = urllib.request.urlopen(req, timeout=10)
        m = json.loads(resp.read())
    except Exception:
        return None

    if m.get('resourceType') != 'Measure':
        return None

    # Extract metadata from Measure resource
    meta = {
        'version': m.get('version'),
        'publisher': m.get('publisher'),
        'group_id': None,
        'group_ids': [],
        'scoring': None,
        'improvementNotation': None,
    }

    # Collect group IDs from all groups
    for group in (m.get('group') or []):
        meta['group_ids'].append(group.get('id'))
    meta['group_id'] = meta['group_ids'][0] if meta['group_ids'] else None

    # scoring and improvementNotation live in group[0].extension
    group = (m.get('group') or [{}])[0]
    for ext in group.get('extension', []):
        url = ext.get('url', '')
        if 'scoring' in url.lower():
            meta['scoring'] = ext.get('valueCodeableConcept')
        elif 'improvementnotation' in url.lower():
            meta['improvementNotation'] = ext.get('valueCodeableConcept')

    _measure_metadata_cache[measure_id] = meta
    return meta


_reporter_org_created = False


def _ensure_reporter_org():
    """Ensure Organization/sql-measure-engine exists in Aidbox (idempotent)."""
    global _reporter_org_created
    if _reporter_org_created:
        return
    try:
        import urllib.request
        import base64
        org = json.dumps({
            "resourceType": "Organization",
            "id": "sql-measure-engine",
            "name": "Aidbox SQL Measure Engine",
            "type": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/organization-type",
                                   "code": "other", "display": "Other"}]}],
        }).encode()
        creds = base64.b64encode(f"{AIDBOX_USER}:{AIDBOX_PASS}".encode()).decode()
        req = urllib.request.Request(
            f"{AIDBOX_URL}/fhir/Organization/sql-measure-engine",
            method="PUT", data=org)
        req.add_header("Authorization", f"Basic {creds}")
        req.add_header("Content-Type", "application/json")
        urllib.request.urlopen(req, timeout=10)
        _reporter_org_created = True
    except Exception:
        pass


DEQM_INDV_PROFILE = "http://hl7.org/fhir/us/davinci-deqm/StructureDefinition/indv-measurereport-deqm"


def enrich_measure_report(report: dict, measure_id: str) -> dict:
    """Enrich MeasureReport with DEQM-required fields from Measure resource.

    Adds: measure version, reporter, scoring extension, improvementNotation, group.id.
    """
    meta = fetch_measure_metadata(measure_id)
    if not meta:
        return report

    # 0. DEQM profile declaration
    report.setdefault('meta', {}).setdefault('profile', [])
    if DEQM_INDV_PROFILE not in report['meta']['profile']:
        report['meta']['profile'].append(DEQM_INDV_PROFILE)

    # 1. Measure canonical with version (deqm-0)
    if meta.get('version') and '|' not in report.get('measure', ''):
        report['measure'] = report['measure'] + '|' + meta['version']

    # 2. Reporter (required 1..1 in DEQM) -- Organization that generated the report
    if 'reporter' not in report:
        _ensure_reporter_org()
        report['reporter'] = {
            'reference': 'Organization/sql-measure-engine',
            'display': 'Aidbox SQL Measure Engine',
        }

    # 3. Scoring extension (Must Support in DEQM)
    if meta.get('scoring'):
        report.setdefault('extension', [])
        # Don't duplicate
        scoring_url = 'http://hl7.org/fhir/us/davinci-deqm/StructureDefinition/extension-measureScoring'
        if not any(e.get('url') == scoring_url for e in report['extension']):
            report['extension'].append({
                'url': scoring_url,
                'valueCodeableConcept': meta['scoring'],
            })

    # 4. ImprovementNotation (conditional required for proportion, deqm-2)
    if meta.get('improvementNotation') and 'improvementNotation' not in report:
        report['improvementNotation'] = meta['improvementNotation']

    # 5. Group IDs (Must Support) -- assign per-group from Measure resource
    group_ids = meta.get('group_ids', [])
    if group_ids and report.get('group'):
        for i, g in enumerate(report['group']):
            if 'id' not in g and i < len(group_ids) and group_ids[i]:
                g['id'] = group_ids[i]

    return report


@app.route('/', methods=['POST'])
def handle_operation():
    """Aidbox HTTP-RPC dispatch endpoint."""
    body = request.get_json(force=True)
    operation_id = body.get('operation', {}).get('id', '')

    if operation_id in ('measure-evaluate', 'measure-evaluate-get'):
        persist = (operation_id == 'measure-evaluate')  # POST persists, GET does not
        return measure_evaluate(body, persist=persist)

    return jsonify({
        'resourceType': 'OperationOutcome',
        'issue': [{'severity': 'error', 'code': 'not-supported',
                    'diagnostics': f'Unknown operation: {operation_id}'}]
    }), 400


def _persist_resource(resource):
    """Save a FHIR resource to Aidbox via POST. Returns saved resource with server-assigned id."""
    import urllib.request
    import base64
    creds = base64.b64encode(f"{AIDBOX_USER}:{AIDBOX_PASS}".encode()).decode()
    rt = resource['resourceType']
    req = urllib.request.Request(
        f"{AIDBOX_URL}/fhir/{rt}",
        method="POST",
        data=json.dumps(resource).encode(),
    )
    req.add_header("Authorization", f"Basic {creds}")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())


def measure_evaluate(body, persist=False):
    """Handle Measure/$evaluate. POST persists the MeasureReport, GET does not."""
    params = body.get('request', {}).get('params', {})

    # Resolve measure from query param (type-level invocation per FHIR spec)
    # Accepts: "cms130", "CMS130FHIRColorectalCancerScrn", canonical URL,
    #          or canonical|version (e.g., "https://madie.cms.gov/Measure/...|1.0.000")
    raw_measure = params.get('measure', '')
    requested_version = None
    # Split canonical|version if present
    if '|' in raw_measure:
        raw_measure, requested_version = raw_measure.rsplit('|', 1)

    measure_id = raw_measure.lower().replace('-', '')
    # If it's a FHIR resource ID or canonical URL, map to short ID
    if measure_id not in MEASURES:
        for mid, info in MEASURES.items():
            fhir_id = info['canonical'].rsplit('/', 1)[-1]
            if raw_measure == fhir_id or raw_measure == info['canonical']:
                measure_id = mid
                break

    # Validate version if specified (canonical|version)
    if requested_version and measure_id in MEASURES:
        meta = fetch_measure_metadata(measure_id)
        actual_version = meta.get('version') if meta else None
        if actual_version and requested_version != actual_version:
            return jsonify({
                'resourceType': 'OperationOutcome',
                'issue': [{'severity': 'error', 'code': 'not-found',
                            'diagnostics': f'Measure version mismatch: requested {requested_version}, '
                                           f'available {actual_version}'}]
            }), 404

    subject = params.get('subject')
    report_type = params.get('reportType')
    period_start = params.get('periodStart', '2026-01-01')
    period_end = params.get('periodEnd', '2026-12-31')

    # Normalize reportType: R4 $evaluate-measure input codes map to R4
    # MeasureReport.type codes used internally.
    #   Input (reportType)  → Internal (MeasureReport.type)
    #   subject             → individual
    #   subject-list        → subject-list
    #   population          → summary
    REPORT_TYPE_MAP = {
        'subject': 'individual',
        'subject-list': 'subject-list',
        'population': 'summary',
    }
    if report_type:
        if report_type not in REPORT_TYPE_MAP:
            return jsonify({
                'resourceType': 'OperationOutcome',
                'issue': [{'severity': 'error', 'code': 'invalid',
                            'diagnostics': f'Invalid reportType: {report_type}. '
                                           f'Valid values: subject, subject-list, population.'}]
            }), 400
        report_type = REPORT_TYPE_MAP[report_type]

    # Validate reportType + subject combination
    if report_type == 'individual' and not subject:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'required',
                        'diagnostics': 'subject parameter is required for reportType=subject'}]
        }), 400

    # Determine effective report type (explicit > inference from subject)
    if not report_type:
        report_type = 'individual' if subject else 'summary'
    elif report_type == 'summary':
        subject = None  # ignore subject for summary

    # Resolve measure
    if measure_id not in MEASURES:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{
                'severity': 'error', 'code': 'not-found',
                'diagnostics': f'Unknown measure: {measure_id}. '
                               f'Available: {", ".join(sorted(MEASURES.keys()))}'
            }]
        }), 404

    measure_info = MEASURES[measure_id]
    sql_path = os.path.join(REPO_ROOT, measure_info['sql'])

    # Read SQL
    try:
        with open(sql_path) as f:
            measure_sql = f.read()
    except FileNotFoundError:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'not-found',
                        'diagnostics': f'SQL file not found: {sql_path}'}]
        }), 500

    # Parameterize measurement period
    measure_sql = parameterize_sql(measure_sql, period_start, period_end)

    # Build patient-level SQL
    patient_id = subject.replace('Patient/', '') if subject else None
    patient_sql = build_patient_sql(measure_sql, patient_id)

    # Execute via Aidbox $sql
    try:
        results = run_sql(patient_sql, AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
    except Exception as e:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'error', 'code': 'exception',
                        'diagnostics': f'SQL execution error: {e}'}]
        }), 500

    if not results:
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{'severity': 'information', 'code': 'not-found',
                        'diagnostics': 'No results. Is measure data loaded?'}]
        }), 404

    exc_type = measure_info.get('exc_type', 'denominator-exclusion')

    if report_type == 'individual':
        # Individual report -- with evidence if available
        evidence_rows = None
        evidence_path = os.path.join(
            REPO_ROOT, "sql", "measures", measure_id, f"03-{measure_id}-evidence.sql")
        if os.path.isfile(evidence_path):
            try:
                with open(evidence_path) as f:
                    ev_fragment = f.read()
                ev_sql = build_evidence_sql(measure_sql, ev_fragment, patient_id)
                if ev_sql:
                    evidence_rows = run_sql(ev_sql, AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
            except Exception:
                pass  # Evidence is best-effort, don't fail the report

        report = build_measure_report(
            results[0], measure_info, period_start, period_end, exc_type,
            evidence_rows=evidence_rows)
        report = enrich_measure_report(report, measure_id)
        if persist:
            try:
                report = _persist_resource(report)
            except Exception as e:
                app.logger.warning(f"Failed to persist MeasureReport: {e}")
        return jsonify(report)

    elif report_type == 'subject-list':
        # Subject-list report — Bundle of per-patient MeasureReports
        # Run SQL for ALL patients (no patient_id filter)
        all_patient_sql = build_patient_sql(measure_sql, None)
        try:
            all_results = run_sql(all_patient_sql, AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
        except Exception as e:
            return jsonify({
                'resourceType': 'OperationOutcome',
                'issue': [{'severity': 'error', 'code': 'exception',
                            'diagnostics': f'SQL execution error: {e}'}]
            }), 500

        entries = []
        for row in all_results:
            report = build_measure_report(
                row, measure_info, period_start, period_end, exc_type)
            report = enrich_measure_report(report, measure_id)
            entries.append({
                'resource': report,
                'search': {'mode': 'match'},
            })

        bundle = {
            'resourceType': 'Bundle',
            'type': 'collection',
            'total': len(entries),
            'entry': entries,
        }
        return jsonify(bundle)

    else:
        # Summary report (default when no subject)
        report = build_summary_report(
            results, measure_info, period_start, period_end, exc_type)
        report = enrich_measure_report(report, measure_id)
        if persist:
            try:
                report = _persist_resource(report)
            except Exception as e:
                app.logger.warning(f"Failed to persist MeasureReport: {e}")
        return jsonify(report)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8090))
    print(f'SQL Measure/$evaluate service starting on port {port}')
    print(f'AIDBOX_URL: {AIDBOX_URL}')
    print(f'REPO_ROOT: {REPO_ROOT}')
    print(f'Measures available: {", ".join(sorted(MEASURES.keys()))}')
    app.run(host='0.0.0.0', port=port, threaded=True)
