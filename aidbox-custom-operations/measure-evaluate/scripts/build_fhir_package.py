#!/usr/bin/env python3
"""Build the metric-suite FHIR NPM package (.tgz) — the single delivery artifact.

By default it carries the whole suite: CodeSystems + ValueSets + ViewDefinitions +
SQLQuery Libraries. Installing it via `$fhir-package-install` (the static init bundle
init.json does this at boot) makes all of them reachable through `/fhir` and
`$sqlquery-run`-able.

Caveat: package install re-keys ViewDefinition/Library `id` to a far-assigned GUID;
the canonical `url` is preserved. So resolve these resources by `url`, not by our slug
id — app/sqlquery_transport.py (for $sqlquery-run) does this. Terminology
(CodeSystem/ValueSet) is keyed by url natively, so the concepts flatten reads it
directly.

Sources (example layout):
  CodeSystems         data/codesystems-bundle.json
  ValueSets           data/<measure>-valuesets.json  (deduplicated by url)
  ViewDefinitions     viewdefinitions/*.json
  SQLQuery Libraries  sqlquery/shared/excl-*.json + sqlquery/measures/*/*.json

Output: dist/fhir-package/<name>-<version>.tgz (dist/ is gitignored — regenerate).

Usage:
  python3 scripts/build_fhir_package.py                      # full package (default)
  python3 scripts/build_fhir_package.py --terminology-only   # CodeSystem + ValueSet only
"""
from __future__ import annotations
import argparse, glob, gzip, json, os, shutil, tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_NAME = "healthsamurai.measure-evaluate"
DEFAULT_VERSION = "0.1.0"


def _read_bundle(path: Path, types: set[str]) -> list[dict]:
    if not path.exists():
        return []
    b = json.loads(path.read_text())
    return [e["resource"] for e in b.get("entry", [])
            if e.get("resource", {}).get("resourceType") in types]


def collect_terminology() -> list[dict]:
    """CodeSystems + all measures' ValueSets, deduplicated by url."""
    cs = _read_bundle(ROOT / "data" / "codesystems-bundle.json", {"CodeSystem"})
    vs_by_url: dict[str, dict] = {}
    for f in sorted(glob.glob(str(ROOT / "data" / "*-valuesets.json"))):
        for r in _read_bundle(Path(f), {"ValueSet"}):
            url = r.get("url")
            if url and url not in vs_by_url:
                vs_by_url[url] = r
    return cs + list(vs_by_url.values())


def collect_viewdefinitions() -> list[dict]:
    return [json.loads(p.read_text())
            for p in sorted((ROOT / "viewdefinitions").glob("*.json"))]


def collect_sqlquery_libraries() -> list[dict]:
    out = []
    for p in sorted((ROOT / "sqlquery" / "shared").glob("excl-*.json")):
        out.append(json.loads(p.read_text()))
    for p in sorted(glob.glob(str(ROOT / "sqlquery" / "measures" / "*" / "*.json"))):
        out.append(json.loads(Path(p).read_text()))
    return out


def _filename(r: dict) -> str:
    rt, rid = r.get("resourceType"), r.get("id")
    if not rt or not rid:
        raise ValueError(f"resource lacks resourceType/id: {r.get('url', r)}")
    return f"{rt}-{rid}.json"


def _index_entry(filename: str, r: dict) -> dict:
    e = {"filename": filename, "resourceType": r["resourceType"]}
    for k in ("id", "url", "version", "kind", "type", "derivation"):
        v = r.get(k)
        if isinstance(v, (str, int, float, bool)):
            e[k] = v
    return e


def write_package(name: str, version: str, resources: list[dict]) -> Path:
    out = ROOT / "dist" / "fhir-package"
    work = out / name / "package"
    if (out / name).exists():
        shutil.rmtree(out / name)
    work.mkdir(parents=True)

    (work / "package.json").write_text(json.dumps({
        "name": name, "version": version,
        "description": "Measure-evaluate quality measures: terminology (CodeSystem + "
                       "ValueSet) + SQL-on-FHIR ViewDefinitions + SQLQuery Libraries",
        "author": "Health Samurai",
        "dependencies": {"hl7.fhir.r4.core": "4.0.1"},
    }, indent=2) + "\n")

    files, seen = [], set()
    for r in sorted(resources, key=lambda r: (r["resourceType"], r.get("id", ""))):
        fn = _filename(r)
        if fn in seen:
            raise ValueError(f"duplicate package filename: {fn}")
        seen.add(fn)
        (work / fn).write_text(json.dumps(r, indent=2) + "\n")
        files.append(_index_entry(fn, r))
    (work / ".index.json").write_text(
        json.dumps({"index-version": 2, "files": files}, indent=2) + "\n")

    # '-' not '#' between name and version: a '#' in a file:// URL is parsed as a URL
    # fragment, truncating the path (Aidbox: FileNotFoundError on '.../<name>').
    archive = out / f"{name}-{version}.tgz"
    # mtime/uid/gid zeroed → byte-reproducible rebuilds
    with archive.open("wb") as raw, \
         gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as gz, \
         tarfile.open(fileobj=gz, mode="w") as tar:
        for path in sorted(work.rglob("*")):
            arc = Path("package") / path.relative_to(work)
            info = tar.gettarinfo(str(path), str(arc))
            info.mtime = 0
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            if path.is_file():
                with path.open("rb") as src:
                    tar.addfile(info, src)
            else:
                tar.addfile(info)
    # Remove the expanded package/ tree — leave only the .tgz in dist/fhir-package/,
    # so Aidbox's file:// package-install resolves the archive, not a sibling dir.
    shutil.rmtree(out / name)
    return archive


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default=DEFAULT_NAME)
    ap.add_argument("--version", default=DEFAULT_VERSION)
    ap.add_argument("--terminology-only", action="store_true",
                    help="Build only CodeSystem + ValueSet (no ViewDefinitions/Libraries). "
                         "Default is the full package.")
    args = ap.parse_args()

    resources = collect_terminology()  # CodeSystem + ValueSet
    if not args.terminology_only:
        resources += collect_viewdefinitions() + collect_sqlquery_libraries()

    archive = write_package(args.name, args.version, resources)

    counts: dict[str, int] = {}
    for r in resources:
        counts[r["resourceType"]] = counts.get(r["resourceType"], 0) + 1
    print(f"Built {archive.relative_to(ROOT)}")
    print(f"  {len(resources)} resources: {counts}")
    if not args.terminology_only:
        print("  NOTE: package install re-keys ViewDefinition/Library `id` to a "
              "far-assigned GUID (canonical `url` preserved) — resolve by url.")


if __name__ == "__main__":
    main()
