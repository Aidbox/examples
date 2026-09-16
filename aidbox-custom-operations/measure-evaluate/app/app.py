#!/usr/bin/env python3
"""
SQL-based Measure/\$evaluate-measure — Aidbox custom operation handler.

Receives HTTP-RPC requests from Aidbox for POST /Measure/{measureId}/\$evaluate-measure,
runs the measure's stored SQLQuery Library resources via the SQL-on-FHIR $sqlquery-run
operation, and returns a FHIR MeasureReport. The calculation SQL lives entirely in
Aidbox (SQLQuery Libraries installed from the FHIR package); this adapter holds only
row -> MeasureReport shaping.
"""

import json
import os
import sys
from datetime import datetime, timezone

from flask import Flask, request, jsonify, redirect, send_from_directory

# Import core logic from evaluate_measure.py
# In Docker: /app/app/evaluate_measure.py; locally: same directory
REPO_ROOT = os.environ.get('REPO_ROOT', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO_ROOT, 'app'))
from evaluate_measure import (
    MEASURES,
    build_measure_report,
    build_summary_report,
)
import sqlquery_transport as sqt
import catalog

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
    # Derive FHIR Measure resource ID from canonical URL; measures that come
    # from the package alone have no registry entry, so fall back to the
    # measure id itself (a Measure resource may or may not exist for it).
    canonical = measure_info.get('canonical', '')
    fhir_id = canonical.rsplit('/', 1)[-1] if '/' in canonical else measure_id
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


# ── Demo app (static) ─────────────────────────────────────────────────────────
# The demo is a single static page plus the theme assets it pulls from the repo
# root. Serving it here means `docker compose up` is the only thing needed to
# reach it — no second local HTTP server. Read-only GETs; the POST / RPC
# endpoint below is untouched.

DEMO_DIR = os.path.join(REPO_ROOT, 'demo')


@app.route('/', methods=['GET'])
def demo_index():
    """Redirect the bare port to the demo app.

    app.html fetches ./config.json relative to the
    current URL, so it must be served from /demo/ — serving it at / would
    resolve those to /config.json and the page would render empty. Redirect
    rather than duplicate the routes, keeping one canonical URL. Query string
    is preserved so http://localhost:8090/?stack=NAME still works.
    """
    qs = request.query_string.decode()
    return redirect('/demo/app.html' + (f'?{qs}' if qs else ''), code=302)


@app.route('/demo/<path:filename>', methods=['GET'])
def demo_files(filename):
    """Serve demo/ assets: app.html and its config."""
    return send_from_directory(DEMO_DIR, filename)


ROOT_ASSETS = frozenset({'light-theme.css', 'dark-theme.css', 'theme-toggle.js'})


@app.route('/<filename>', methods=['GET'])
def root_assets(filename):
    """Theme assets that app.html references as ../ from demo/."""
    if filename not in ROOT_ASSETS:
        return jsonify({'error': 'not found'}), 404
    return send_from_directory(REPO_ROOT, filename)


# ── Catalog + materialization API (demo UI) ──────────────────────────────────
# Read the measure list from Aidbox rather than the bundled JSON, and expose
# $materialize per measure or for everything. Long-running by nature: the UI
# holds a spinner until these return.

@app.route('/api/catalog', methods=['GET'])
def api_catalog():
    """Measures installed in this Aidbox, with SQL + materialization state."""
    try:
        return jsonify(catalog.build_catalog())
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/materialize', methods=['POST'])
def api_materialize():
    """Materialize the ViewDefinitions a measure needs, or all of them.

    Body: {"measures": ["cms130"], "force": false}. Omit `measures` to cover
    every measure. Views already present are skipped unless `force`.
    """
    body = request.get_json(silent=True) or {}
    measures = body.get('measures') or None
    if isinstance(measures, str):
        measures = [measures]
    try:
        plan = catalog.plan_materialization(
            measure_ids=measures, force=bool(body.get('force')))
        # No wrapper views to manage: Aidbox resolves the package's `sql-view`
        # Libraries itself, inlining each as a CTE when it runs a SQLQuery. The
        # measure SQL's bare `patient_flat` therefore needs no database view —
        # verified by dropping all 22 and re-running a measure unchanged.
        results = catalog.materialize_views(plan['todo'])
        # The package's own DB-side setup: terminology flatten (sof.concept +
        # `concepts`) and the sof.* indexes, which $materialize's DROP TABLE
        # removes. Both are idempotent, so run them on every materialize.
        # Indexes run statement-by-statement: the script covers every flat table
        # the package ships, but a single-measure run only recreates a subset,
        # and one missing table must not roll back the other indexes.
        setup = (catalog.run_setup_libraries(per_statement=True)
                 if plan['todo'] else [])
        # setup-00-terminology recreates sof.concept empty; refill it from the
        # far.valueset registry, which no package resource can do.
        concepts = catalog.populate_concepts() if plan['todo'] else None
    except Exception as e:
        return jsonify({'error': str(e)}), 502

    failed = ([r for r in results if r['status'] != 'ok']
              + [r for r in setup if r['status'] not in ('ok', 'partial')]
              + ([{**concepts, 'script': 'terminology-flatten'}]
                 if concepts and concepts['status'] != 'ok' else []))
    return jsonify({
        'measures': plan['measures'],
        'materialized': [r['view'] for r in results if r['status'] == 'ok'],
        'setup': [r['script'] for r in setup if r['status'] in ('ok', 'partial')],
        'concepts': (concepts or {}).get('concepts'),
        'skipped': plan['skipped'],
        'manual': plan['manual'],
        'failed': failed,
        'ok': not failed,
    }), (207 if failed else 200)


@app.route('/api/measure/<measure_id>/summary', methods=['GET'])
def api_measure_summary(measure_id):
    """Overview stats for one measure, computed from its SQLQuery Libraries.

    The demo needs `total` and the open-gap patient ids, which the `-summary`
    Library does not expose (it returns only the population aggregates), so this
    derives both from `-per-patient`. One Library call, shaped for the UI.
    """
    start = request.args.get('periodStart') or request.args.get('start')
    end = request.args.get('periodEnd') or request.args.get('end')
    if not start or not end:
        return jsonify({'error': 'periodStart and periodEnd are required'}), 400
    try:
        rows = sqt.per_patient_rows(measure_id, start, end,
                                    AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
    except Exception as e:
        return jsonify({'error': str(e)}), 502

    total = len(rows)
    ip = sum(r['ip'] for r in rows)
    den = sum(r['den'] for r in rows)
    exc = sum(r['exc'] for r in rows)
    num = sum(r['num'] for r in rows)
    open_ids = [r['patient_id'] for r in rows
                if r['ip'] and not r['num'] and not r['exc']]
    return jsonify({'measure': measure_id, 'total': total, 'ip': ip, 'den': den,
                    'exc': exc, 'num': num, 'open_patient_ids': open_ids})


@app.route('/api/measure/<measure_id>/patients', methods=['GET'])
def api_measure_patients(measure_id):
    """Per-patient membership rows ({patient_id, ip, den, exc, num}) for a measure."""
    start = request.args.get('periodStart') or request.args.get('start')
    end = request.args.get('periodEnd') or request.args.get('end')
    if not start or not end:
        return jsonify({'error': 'periodStart and periodEnd are required'}), 400
    try:
        rows = sqt.per_patient_rows(measure_id, start, end,
                                    AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
    except Exception as e:
        return jsonify({'error': str(e)}), 502
    subject = request.args.get('subject')
    if subject:
        rows = [r for r in rows if r['patient_id'] == subject]
    return jsonify({'measure': measure_id, 'rows': rows})


@app.route('/api/measure/<measure_id>/evidence', methods=['GET'])
def api_measure_evidence(measure_id):
    """Decision-chain evidence rows, optionally narrowed to one patient."""
    start = request.args.get('periodStart') or request.args.get('start')
    end = request.args.get('periodEnd') or request.args.get('end')
    if not start or not end:
        return jsonify({'error': 'periodStart and periodEnd are required'}), 400
    rows = sqt.evidence_rows(measure_id, start, end,
                             AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
    if rows is None:
        return jsonify({'measure': measure_id, 'rows': [], 'available': False})
    subject = request.args.get('subject')
    if subject:
        rows = [r for r in rows if r.get('patient_id') == subject]
    return jsonify({'measure': measure_id, 'rows': rows, 'available': True})


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
    """Handle Measure/\$evaluate-measure. POST persists the MeasureReport, GET does not."""
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
            canonical = info.get('canonical') or ''
            fhir_id = canonical.rsplit('/', 1)[-1]
            if canonical and (raw_measure == fhir_id or raw_measure == canonical):
                measure_id = mid
                break

    # Fetch Measure resource from Aidbox (primary metadata source)
    measure_meta = fetch_measure_metadata(measure_id)

    # Version validation: Measure.version (or requested version) vs registry supported_version
    if measure_id in MEASURES:
        supported = MEASURES[measure_id].get('supported_version')
        actual_version = (measure_meta.get('version') if measure_meta else None) or requested_version
        if actual_version and supported and actual_version != supported:
            return jsonify({
                'resourceType': 'OperationOutcome',
                'issue': [{'severity': 'error', 'code': 'business-rule',
                            'diagnostics': f'Measure version mismatch: version {actual_version}, '
                                           f'SQL implementation supports {supported}'}]
            }), 422
        # Explicit requested version must also match the Measure resource version
        if requested_version and measure_meta and measure_meta.get('version'):
            if requested_version != measure_meta['version']:
                return jsonify({
                    'resourceType': 'OperationOutcome',
                    'issue': [{'severity': 'error', 'code': 'not-found',
                                'diagnostics': f'Requested version {requested_version} does not match '
                                               f'Measure resource version {measure_meta["version"]}'}]
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

    # Resolve measure. The installed SQLQuery Libraries are the source of truth
    # for what can be evaluated — the local registry only supplies optional
    # extras (exc_type, supported_version) for the measures it happens to know,
    # so a package shipping measures the registry has never heard of still works.
    if measure_id not in MEASURES and not catalog.measure_is_installed(measure_id):
        try:
            available = ', '.join(sorted(catalog.installed_measure_ids()))
        except Exception:
            available = ', '.join(sorted(MEASURES.keys()))
        return jsonify({
            'resourceType': 'OperationOutcome',
            'issue': [{
                'severity': 'error', 'code': 'not-found',
                'diagnostics': f'Unknown measure: {measure_id}. '
                               f'Available: {available}'
            }]
        }), 404

    measure_info = dict(MEASURES.get(measure_id, {}))
    # Measures that come from the package alone have no registry entry; the
    # MeasureReport still needs a canonical for `.measure`. Prefer the Measure
    # resource's url when the package ships one, else derive a stable canonical
    # from the measure id.
    if not measure_info.get('canonical'):
        measure_info['canonical'] = (
            (measure_meta or {}).get('url')
            or f'http://ecqi.healthit.gov/ecqms/Measure/{measure_id.upper()}')
    exc_type = measure_info.get('exc_type', 'denominator-exclusion')
    patient_id = subject.replace('Patient/', '') if subject else None

    # Execute via the SQL-on-FHIR $sqlquery-run operation. The calculation SQL is the
    # single source of truth held in Aidbox as SQLQuery Library resources
    # (<id>-{summary,per-patient,evidence}, installed from the FHIR package); this
    # adapter holds no measure SQL, only the row -> MeasureReport shaping
    # (build_*_report, transport-agnostic).
    def _err(msg, code, http):
        return jsonify({'resourceType': 'OperationOutcome',
                        'issue': [{'severity': 'error', 'code': code, 'diagnostics': msg}]}), http

    try:
        if report_type == 'individual':
            rows = sqt.per_patient_rows(measure_id, period_start, period_end,
                                        AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
            match = next((r for r in rows if r['patient_id'] == patient_id), None)
            if match is None:
                return _err(f'Patient/{patient_id} not found for {measure_id}. '
                            'Is measure data loaded?', 'not-found', 404)
            # Evidence rows for this patient (best-effort -- never fail the report)
            evidence_rows = None
            ev = sqt.evidence_rows(measure_id, period_start, period_end,
                                   AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
            if ev is not None:
                evidence_rows = [e for e in ev if e.get('patient_id') == patient_id]
            report = build_measure_report(
                match, measure_info, period_start, period_end, exc_type,
                evidence_rows=evidence_rows)
            report = enrich_measure_report(report, measure_id)
            if persist:
                try:
                    report = _persist_resource(report)
                except Exception as e:
                    app.logger.warning(f"Failed to persist MeasureReport: {e}")
            return jsonify(report)

        elif report_type == 'subject-list':
            rows = sqt.per_patient_rows(measure_id, period_start, period_end,
                                        AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
            entries = []
            for row in rows:
                report = build_measure_report(
                    row, measure_info, period_start, period_end, exc_type)
                report = enrich_measure_report(report, measure_id)
                entries.append({'resource': report, 'search': {'mode': 'match'}})
            return jsonify({'resourceType': 'Bundle', 'type': 'collection',
                            'total': len(entries), 'entry': entries})

        else:  # summary (population)
            results = sqt.summary_row(measure_id, period_start, period_end,
                                      AIDBOX_URL, AIDBOX_USER, AIDBOX_PASS)
            if not results:
                return jsonify({'resourceType': 'OperationOutcome',
                                'issue': [{'severity': 'information', 'code': 'not-found',
                                           'diagnostics': 'No results. Is measure data loaded?'}]}), 404
            report = build_summary_report(
                results, measure_info, period_start, period_end, exc_type)
            report = enrich_measure_report(report, measure_id)
            if persist:
                try:
                    report = _persist_resource(report)
                except Exception as e:
                    app.logger.warning(f"Failed to persist MeasureReport: {e}")
            return jsonify(report)
    except Exception as e:
        return _err(f'$sqlquery-run execution error: {e}', 'exception', 500)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8090))
    print(f'SQL Measure/\$evaluate-measure service starting on port {port}')
    print(f'AIDBOX_URL: {AIDBOX_URL}')
    print(f'REPO_ROOT: {REPO_ROOT}')
    print(f'Measures available: {", ".join(sorted(MEASURES.keys()))}')
    app.run(host='0.0.0.0', port=port, threaded=True)
