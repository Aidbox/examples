#!/usr/bin/env python3
"""Load the sample clinical data bundles into Aidbox.

This is the only setup step that is not delivered by a FHIR package. Everything
else the measures need — ViewDefinitions, the SQLQuery Libraries holding the
measure SQL, the typed `sql-view` wrapper layer, and the `setup-NN-*` scripts
for terminology scaffolding and indexes — ships in the package and is applied by
the app (POST /api/materialize), so nothing here is measure-specific.

The bundles under data/ are plain FHIR transaction Bundles of demo patients and
their clinical resources. Loading them is independent of which measure package
is installed: the same 485 patients exercise a 12-measure package or a
74-measure one.

Usage:
    python3 load-demo-data.py                     # load every data/*-clinical-data.json
    python3 load-demo-data.py --aidbox URL        # target another Aidbox
    python3 load-demo-data.py --materialize       # re-materialize afterwards

After loading, the flattened sof.* tables are stale until re-materialized —
either pass --materialize, or press "Materialize all" in the demo app.
"""

import argparse
import base64
import glob
import json
import os
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, 'data')


def post(url, body, user, password, timeout=600):
    creds = base64.b64encode(f'{user}:{password}'.encode()).decode()
    req = urllib.request.Request(url, method='POST', data=body)
    req.add_header('Authorization', f'Basic {creds}')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read()


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--aidbox', default=os.environ.get('AIDBOX_URL', 'http://localhost:8888'))
    ap.add_argument('--user', default=os.environ.get('AIDBOX_USER', 'root'))
    ap.add_argument('--password', default=os.environ.get('AIDBOX_PASS', 'secret'))
    ap.add_argument('--app', default=os.environ.get('APP_URL', 'http://localhost:8090'),
                    help='demo app base url, used by --materialize')
    ap.add_argument('--materialize', action='store_true',
                    help='rebuild the sof.* tables and wrapper views after loading')
    args = ap.parse_args()

    bundles = sorted(glob.glob(os.path.join(DATA_DIR, '*-clinical-data.json')))
    if not bundles:
        print(f'No *-clinical-data.json bundles found in {DATA_DIR}')
        return 1

    print(f'Loading {len(bundles)} clinical data bundle(s) into {args.aidbox}')
    rejected = 0
    for path in bundles:
        name = os.path.basename(path)
        with open(path, 'rb') as f:
            payload = f.read()
        try:
            post(f'{args.aidbox}/fhir', payload, args.user, args.password)
            entries = len(json.loads(payload).get('entry', []))
            print(f'  OK   {name}  ({entries} entries)')
            continue
        except urllib.error.HTTPError:
            pass
        except Exception as e:
            print(f'  FAIL {name}  {e}')
            rejected += 1
            continue

        # A FHIR transaction is atomic, so one resource Aidbox rejects (a bad
        # display name, a failed constraint) sinks the whole bundle. Retry entry
        # by entry so the rest of the demo data still lands, and report what was
        # dropped instead of failing the run.
        bundle = json.loads(payload)
        loaded, bad = 0, []
        for entry in bundle.get('entry', []):
            one = json.dumps({'resourceType': 'Bundle', 'type': 'transaction',
                              'entry': [entry]}).encode()
            try:
                post(f'{args.aidbox}/fhir', one, args.user, args.password, timeout=60)
                loaded += 1
            except Exception:
                res = entry.get('resource', {})
                bad.append(f"{res.get('resourceType','?')}/{res.get('id','?')}")
        rejected += len(bad)
        print(f'  WARN {name}  {loaded} loaded, {len(bad)} rejected: '
              f"{', '.join(bad[:4])}{' …' if len(bad) > 4 else ''}")

    if rejected:
        print(f'\n{rejected} resource(s) rejected by validation; the rest loaded.')

    if args.materialize:
        print('\nRe-materializing sof.* tables and wrapper views...')
        try:
            status, body = post(f'{args.app}/api/materialize',
                                json.dumps({'force': True}).encode(),
                                args.user, args.password, timeout=3600)
            out = json.loads(body)
            print(f"  tables: {len(out.get('materialized', []))}  "
                  f"views: {len(out.get('wrapper_views', []))}  "
                  f"concepts: {out.get('concepts')}")
            if not out.get('ok'):
                print(f"  failures: {out.get('failed')}")
                return 1
        except Exception as e:
            print(f'  FAIL {e}')
            return 1
    else:
        print('\nDone. The sof.* tables are now stale — press "Materialize all" '
              f'in the demo app ({args.app}) or re-run with --materialize.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
