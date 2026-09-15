#!/usr/bin/env python3
"""Measure catalog + ViewDefinition materialization, driven by Aidbox content.

Two things the demo needs that are not in the repo's static JSON:

1. **Catalog** — the measures actually installed in this Aidbox. A FHIR package
   ships `Measure` resources for metadata and SQLQuery `Library` resources
   holding the SQL. A measure is *computable* only if it has the SQLQuery
   Libraries, so the catalog joins the two and reports both facts.

2. **Materialization** — SQLQuery Libraries declare what they read via
   `relatedArtifact[type=depends-on]`, which may point at a ViewDefinition *or*
   at another Library (the shared `excl-*` helpers). Resolving that graph
   transitively yields the ViewDefinitions a measure truly needs, so the UI can
   materialize one measure's subset or everything at once, skipping views that
   already exist.
"""

import base64
import json
import os
import re
import urllib.error
import urllib.request
from urllib.parse import quote

AIDBOX_URL = os.environ.get('AIDBOX_URL', 'http://localhost:8888')
AIDBOX_USER = os.environ.get('AIDBOX_USER', 'root')
AIDBOX_PASS = os.environ.get('AIDBOX_PASS', 'secret')

SQLQUERY_PROFILE = 'https://sql-on-fhir.org/ig/StructureDefinition/SQLQuery'

# Materializing a whole resource type can take minutes on a large box; the UI
# shows a spinner for the duration, so allow far more than a normal API call.
MATERIALIZE_TIMEOUT = 3600
API_TIMEOUT = 30

# `concept` is populated by the terminology flatten (populate_concepts), not by
# $materialize — Aidbox keeps ValueSets in the far registry, invisible to the
# SoF engine. Never try to materialize it, but still surface it so a missing
# sof.concept is visible.
MANUAL_VIEWS = frozenset({'concept'})

# $materialize requires an explicit materialization type; `table` is what the
# wrapper views and measure SQL expect to read from.
MATERIALIZE_BODY = {'resourceType': 'Parameters',
                    'parameter': [{'name': 'type', 'valueCode': 'table'}]}


def _req(path, method='GET', body=None, timeout=API_TIMEOUT):
    """Call Aidbox with basic auth. Returns parsed JSON (or {} for empty)."""
    creds = base64.b64encode(f'{AIDBOX_USER}:{AIDBOX_PASS}'.encode()).decode()
    url = path if path.startswith('http') else f'{AIDBOX_URL}{path}'
    req = urllib.request.Request(url, method=method)
    req.add_header('Authorization', f'Basic {creds}')
    if body is not None:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(body).encode()
    resp = urllib.request.urlopen(req, timeout=timeout)
    raw = resp.read().decode()
    return json.loads(raw) if raw.strip() else {}


def _entries(bundle):
    return [e['resource'] for e in (bundle.get('entry') or []) if e.get('resource')]


def _page_all(base_path, page_size=1000, cap=10000):
    """Read every page of a search. Catalogs are small; cap guards runaways."""
    out, offset = [], 0
    sep = '&' if '?' in base_path else '?'
    while offset < cap:
        b = _req(f'{base_path}{sep}_count={page_size}&_page={offset // page_size + 1}')
        page = _entries(b)
        out.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return out


# ── Dependency graph ─────────────────────────────────────────────────────────

def _slug(url):
    """Last path segment of a canonical url — the id the repo/package uses."""
    return (url or '').rstrip('/').rsplit('/', 1)[-1]


def library_type(lib):
    """`sql-query`, `sql-view`, or whatever Library.type declares."""
    for c in (lib.get('type') or {}).get('coding') or []:
        if c.get('code'):
            return c['code']
    return None


def load_sqlquery_libraries():
    """Libraries in the box: (sql-query list, lookup index over ALL of them).

    Only `sql-query` Libraries define measures, but `depends-on` edges point at
    `sql-view` wrappers too, so the index has to span both for dependency
    resolution to walk through them. `_profile` search is not a reliable filter
    here, so the split is done on Library.type.
    """
    libs = _page_all('/fhir/Library')
    by_key = {}
    for lib in libs:
        url = lib.get('url') or ''
        for key in filter(None, (url, _slug(url), lib.get('id'))):
            by_key[key] = lib
    queries = [l for l in libs if library_type(l) == 'sql-query']
    return queries, by_key


def resolve_view_deps(lib, by_key, _seen=None):
    """ViewDefinition slugs a Library needs, following Library->Library edges.

    `relatedArtifact[depends-on]` references both ViewDefinitions and other
    Libraries (the SQLView wrappers and the shared `excl-*` queries). The
    canonical url says which — `.../ViewDefinition/x` vs `.../Library/x` — so
    dispatch on the url rather than guessing from the slug. Cycles are guarded
    by `_seen`.
    """
    if _seen is None:
        _seen = set()
    lib_id = lib.get('id') or lib.get('url')
    if lib_id in _seen:
        return set()
    _seen.add(lib_id)

    views = set()
    for art in lib.get('relatedArtifact') or []:
        if art.get('type') != 'depends-on':
            continue
        ref = art.get('resource') or ''
        if not ref:
            continue
        if '/ViewDefinition/' in ref:
            views.add(_slug(ref))
            continue
        target = by_key.get(ref) or by_key.get(_slug(ref))
        if target is not None:
            views |= resolve_view_deps(target, by_key, _seen)
        else:
            # Unknown reference shape — assume a ViewDefinition, as before.
            views.add(_slug(ref))
    return views


# ── sof.* state ──────────────────────────────────────────────────────────────

def _view_table(slug):
    """sof table name for a ViewDefinition slug (`condition-flat` -> `condition_flat`)."""
    return slug.replace('-', '_')


def materialized_tables():
    """sof.* tables that currently exist, as a set of table names."""
    sql = ("select table_name from information_schema.tables "
           "where table_schema = 'sof'")
    try:
        rows = _req('/$sql', method='POST', body=[sql])
    except urllib.error.HTTPError:
        return set()
    out = set()
    for r in rows if isinstance(rows, list) else []:
        if isinstance(r, dict):
            out.add(r.get('table_name'))
        elif isinstance(r, list) and r:
            out.add(r[0])
    return {t for t in out if t}


def viewdefinition_index():
    """Map ViewDefinition slug -> runtime id.

    The package re-keys ViewDefinitions to server-assigned ids while preserving
    the canonical url, and $materialize is addressed by id — so the slug the
    Libraries reference has to be resolved through the url.
    """
    vds = _page_all('/fhir/ViewDefinition?_elements=id,url,name,resource')
    idx = {}
    for vd in vds:
        for key in filter(None, (_slug(vd.get('url')), vd.get('name'), vd.get('id'))):
            idx.setdefault(key, vd)
    return idx


# ── Catalog ──────────────────────────────────────────────────────────────────

# A measure's SQLQuery Libraries are named `<measure>-summary`,
# `<measure>-per-patient`, `<measure>-evidence`. The role suffix is what marks a
# Library as belonging to a measure — shared helpers (`excl-hospice`) have none.
LIB_ROLES = ('summary', 'per-patient', 'evidence')
_LIB_RE = re.compile(r'^(?P<measure>.+)-(?P<role>%s)$' % '|'.join(LIB_ROLES))


def _measure_key(resource):
    """(measure_id, role) for a SQLQuery Library, or (None, None) if shared.

    Keys off the canonical url slug, not `id`: a FHIR package install re-keys
    resources to server-assigned GUIDs while preserving `url`.
    """
    for cand in (_slug(resource.get('url')), resource.get('id')):
        if not cand:
            continue
        m = _LIB_RE.match(str(cand))
        if m:
            return m.group('measure').lower(), m.group('role')
    return None, None


def build_catalog():
    """Measures installed in this Aidbox, derived from their SQLQuery Libraries.

    The SQL is the source of truth for what can be computed, so the catalog is
    built from Libraries (`<measure>-summary` etc). `Measure` resources are
    optional: when the package ships them they supply title/version/description,
    but a package of Libraries alone still yields a full catalog.

    """
    libs, by_key = load_sqlquery_libraries()
    tables = materialized_tables()

    libs_by_measure = {}
    for lib in libs:
        key, role = _measure_key(lib)
        if key:
            libs_by_measure.setdefault(key, {})[role] = lib

    # Optional metadata. Absent in Library-only packages — never required.
    meta_by_measure = {}
    try:
        for m in _page_all('/fhir/Measure?_elements=id,url,name,title,version,status,description'):
            slug = _slug(m.get('url')) or m.get('id') or ''
            mk = _LIB_RE.sub(r'\1', slug).lower()
            meta_by_measure[mk] = m
    except Exception:
        pass

    out = []
    for key in sorted(libs_by_measure):
        roles = libs_by_measure.get(key, {})
        meta = meta_by_measure.get(key, {})
        views = set()
        for lib in roles.values():
            views |= resolve_view_deps(lib, by_key)
        # `concept` is built by the terminology flatten, not $materialize.
        # Report it separately so it never blocks a measure the UI could fix —
        # nothing the Materialize button does would ever clear it.
        absent = [v for v in views if _view_table(v) not in tables]
        missing = sorted(v for v in absent if v not in MANUAL_VIEWS)
        missing_manual = sorted(v for v in absent if v in MANUAL_VIEWS)
        out.append({
            'id': key,
            'name': meta.get('title') or meta.get('name') or key.upper(),
            'version': meta.get('version'),
            'status': meta.get('status'),
            'description': meta.get('description'),
            'url': meta.get('url'),
            'has_sql': bool(roles),
            'roles': sorted(roles),
            'views': sorted(views),
            'missing_views': missing,
            'missing_manual': missing_manual,
            'materialized': bool(views) and not missing,
        })
    out.sort(key=lambda r: (not r['has_sql'], r['id']))
    return {
        'measures': out,
        'total': len(out),
        'computable': sum(1 for r in out if r['has_sql']),
        'materialized': sum(1 for r in out if r['materialized']),
        'sof_tables': sorted(tables),
    }


# ── Package setup scripts ────────────────────────────────────────────────────
# The package ships the DB-side steps $materialize cannot express as
# `logic-library` Libraries named `setup-NN-*`: the terminology flatten
# (sof.concept + `concepts`, sourced from far.valueset) and the sof.* indexes.
# The NN prefix orders them. Indexes must be reapplied after every
# $materialize, which drops the tables they sit on.

def _library_sql(lib):
    """SQL body of a Library — base64 `content.data` or a sql-text extension."""
    for c in lib.get('content') or []:
        if c.get('data'):
            return base64.b64decode(c['data']).decode()
        for ext in c.get('extension') or []:
            if ext.get('valueString'):
                return ext['valueString']
    return None


def setup_libraries():
    """`logic-library` setup scripts, ordered by their `setup-NN-` slug."""
    out = []
    for lib in _page_all('/fhir/Library'):
        if library_type(lib) != 'logic-library':
            continue
        slug = _slug(lib.get('url'))
        if not slug.startswith('setup-'):
            continue
        sql = _library_sql(lib)
        if sql:
            out.append({'slug': slug, 'sql': sql})
    out.sort(key=lambda r: r['slug'])
    return out


def _split_statements(sql):
    """Split a SQL script on top-level semicolons.

    Skips semicolons inside line comments, string literals and $$-quoted bodies
    — a `--` comment containing one would otherwise split mid-sentence and send
    prose to the server as a statement.
    """
    out, buf, i, n = [], [], 0, len(sql)
    dollar = None
    while i < n:
        ch = sql[i]
        if not dollar:
            if sql.startswith('--', i):
                j = sql.find('\n', i)
                j = n if j == -1 else j + 1
                buf.append(sql[i:j]); i = j
                continue
            if sql.startswith('/*', i):
                j = sql.find('*/', i)
                j = n if j == -1 else j + 2
                buf.append(sql[i:j]); i = j
                continue
            if ch == "'":
                j = i + 1
                while j < n:
                    if sql[j] == "'":
                        if j + 1 < n and sql[j + 1] == "'":
                            j += 2; continue
                        j += 1; break
                    j += 1
                buf.append(sql[i:j]); i = j
                continue
        if dollar:
            if sql.startswith(dollar, i):
                buf.append(dollar); i += len(dollar); dollar = None
                continue
        elif ch == '$':
            m = re.match(r'\$[A-Za-z_]*\$', sql[i:])
            if m:
                dollar = m.group(0)
                buf.append(dollar); i += len(dollar)
                continue
        elif ch == ';':
            stmt = ''.join(buf).strip()
            if stmt:
                out.append(stmt)
            buf = []; i += 1
            continue
        buf.append(ch); i += 1
    tail = ''.join(buf).strip()
    if tail:
        out.append(tail)
    return out


def run_setup_libraries(slugs=None, per_statement=False):
    """Execute the package's setup scripts. Returns a per-script result list.

    `per_statement` runs each statement in its own request so one failure does
    not roll back the rest — needed for the index script, which covers every
    flat table the package ships while a single-measure materialize only
    recreates that measure's subset.
    """
    results = []
    for item in setup_libraries():
        if slugs is not None and item['slug'] not in set(slugs):
            continue
        try:
            if per_statement:
                errs = []
                for stmt in _split_statements(item['sql']):
                    try:
                        _req('/$sql', method='POST',
                             body=["SET LOCAL lock_timeout = '60s';\n" + stmt],
                             timeout=MATERIALIZE_TIMEOUT)
                    except Exception as e:
                        errs.append(str(e)[:120])
                results.append({'script': item['slug'],
                                'status': 'ok' if not errs else 'partial',
                                'skipped_statements': len(errs)})
                continue
            _req('/$sql', method='POST',
                 body=["SET LOCAL lock_timeout = '60s';\n" + item['sql']],
                 timeout=MATERIALIZE_TIMEOUT)
            results.append({'script': item['slug'], 'status': 'ok'})
        except urllib.error.HTTPError as e:
            detail = ''
            try:
                detail = e.read().decode()[:400]
            except Exception:
                pass
            results.append({'script': item['slug'], 'status': 'error',
                            'error': f'HTTP {e.code}', 'detail': detail})
        except Exception as e:
            results.append({'script': item['slug'], 'status': 'error', 'error': str(e)})
    return results


# ── Terminology ──────────────────────────────────────────────────────────────
# `concepts` is the one thing no package resource can fill: Aidbox keeps
# ValueSets in the far.* registry, invisible to the SoF engine, so $materialize
# cannot populate sof.concept. The package's setup-00-terminology script builds
# the empty table + view; this flattens every expanded ValueSet into it.

FLATTEN_CONCEPTS_SQL = """
INSERT INTO sof.concept (valueset_url, valueset_name, system, code, display)
SELECT DISTINCT
    resource->>'url'  AS valueset_url,
    resource->>'name' AS valueset_name,
    c->>'system'      AS system,
    c->>'code'        AS code,
    left(c->>'display', 200) AS display
FROM far.valueset,
     jsonb_array_elements(resource->'expansion'->'contains') AS c
WHERE c->>'code' IS NOT NULL
  AND c->>'system' IS NOT NULL
ON CONFLICT (valueset_url, system, code) DO NOTHING
"""


def populate_concepts():
    """Flatten far.valueset expansions into sof.concept. Idempotent."""
    try:
        _req('/$sql', method='POST', body=[FLATTEN_CONCEPTS_SQL],
             timeout=MATERIALIZE_TIMEOUT)
        rows = _req('/$sql', method='POST', body=['SELECT count(*) AS n FROM sof.concept'])
        n = None
        if isinstance(rows, list) and rows:
            r = rows[0]
            n = r.get('n') if isinstance(r, dict) else (r[0] if isinstance(r, list) else None)
        return {'status': 'ok', 'concepts': n}
    except urllib.error.HTTPError as e:
        detail = ''
        try:
            detail = e.read().decode()[:400]
        except Exception:
            pass
        return {'status': 'error', 'error': f'HTTP {e.code}', 'detail': detail}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}


# ── SQLView wrapper layer ────────────────────────────────────────────────────
# The package ships the typed wrapper layer as `sql-view` Libraries: one per
# flat table, projecting sof.<name> into the column names/types the measure SQL
# reads (COALESCEd date halves, knife_date_bound casts, boolean has_value).
#
# These are NOT database views. Aidbox resolves them itself — when a SQLQuery
# Library runs, each `sql-view` it depends on is inlined as a CTE, so the
# measure SQL's bare `patient_flat` resolves without anything existing in
# `public`. Confirmed by dropping all 22 views and re-running a measure to the
# same numbers, while raw $sql on `patient_flat` still errors.
#
# Kept here for introspection only.

def sqlview_libraries():
    """`sql-view` Libraries, name -> (name, sql body)."""
    libs = _page_all('/fhir/Library')
    out = {}
    for lib in libs:
        if library_type(lib) != 'sql-view':
            continue
        name = lib.get('name') or _slug(lib.get('url'))
        body = None
        for c in lib.get('content') or []:
            if c.get('data'):
                body = base64.b64decode(c['data']).decode()
                break
            for ext in c.get('extension') or []:
                if ext.get('valueString'):
                    body = ext['valueString']
                    break
        if name and body:
            out[name] = body
    return out


# ── Materialization ──────────────────────────────────────────────────────────

def plan_materialization(measure_ids=None, force=False):
    """Which ViewDefinitions to materialize, and which are already done.

    measure_ids=None means every measure (the all-at-once button). Views shared
    between measures appear once — the plan is a set, so overlapping measures
    cost nothing extra.
    """
    catalog = build_catalog()
    rows = catalog['measures']
    if measure_ids:
        wanted = {m.lower() for m in measure_ids}
        rows = [r for r in rows if (r['id'] or '').lower() in wanted]

    needed = set()
    for r in rows:
        needed |= set(r['views'])

    # Materializing every measure also means the package's own setup scripts
    # run, and those cover every flat table the package ships — including ones
    # no installed measure references. Pull those in so index creation does not
    # trip over a missing sof.* table.
    if not measure_ids:
        needed |= {n for n in viewdefinition_index() if n.endswith('-flat')}

    tables = set(catalog['sof_tables'])
    manual = sorted(v for v in needed if v in MANUAL_VIEWS)
    candidates = sorted(v for v in needed if v not in MANUAL_VIEWS)
    todo = candidates if force else [v for v in candidates
                                     if _view_table(v) not in tables]
    skipped = [v for v in candidates if v not in todo]
    return {
        'measures': [r['id'] for r in rows],
        'todo': todo,
        'skipped': skipped,
        'manual': manual,
    }


def materialize_views(view_slugs):
    """POST $materialize for each ViewDefinition. Returns a per-view result list."""
    idx = viewdefinition_index()
    results = []
    for slug in view_slugs:
        vd = idx.get(slug)
        if vd is None:
            results.append({'view': slug, 'status': 'error',
                            'error': 'ViewDefinition not found in Aidbox'})
            continue
        try:
            _req(f"/fhir/ViewDefinition/{vd['id']}/$materialize", method='POST',
                 body=MATERIALIZE_BODY, timeout=MATERIALIZE_TIMEOUT)
            results.append({'view': slug, 'status': 'ok'})
        except urllib.error.HTTPError as e:
            detail = ''
            try:
                detail = e.read().decode()[:400]
            except Exception:
                pass
            results.append({'view': slug, 'status': 'error',
                            'error': f'HTTP {e.code}', 'detail': detail})
        except Exception as e:
            results.append({'view': slug, 'status': 'error', 'error': str(e)})
    return results
