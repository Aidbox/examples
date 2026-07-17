---
features: [Configuration, Init bundle, Seed data, Custom resource, Custom FHIR IG, AccessPolicy, Client, App, CI/CD]
languages: [Shell, YAML]
---

# Init Bundle from Resource Directories

Compile a directory of per-resource-type JSON files into one Aidbox
[init bundle](https://www.health-samurai.io/docs/aidbox/configuration/init-bundle.md)
(config + seed data) that loads at startup — instead of a hand-ordered script
that POSTs resources one by one after boot.

```
ig/package/                          # source of the custom FHIR IG
common/                              # → EVERY environment (config)
├── 00_packages/                     #   installs the local custom IG ($fhir-package-install)
├── 01_StructureDefinition/          #   custom resource TYPE (ClinicalSnippet)
├── 02_App/  03_Client/  04_AccessPolicy/
dev/                                 # → dev only (full demo/seed data)
└── 05_Organization/ 06_Practitioner/ 07_Patient/ 08_Observation/ 09_ClinicalSnippet/
qa/                                  # → qa only (minimal smoke subset)
└── 05_Organization/ 07_Patient/
prod/                                # → prod only (empty: prod = common only)
```

A bundle for an environment is `common/` + that environment's own folder, so
the tree shows exactly what each env gets: `dev` = common + dev, `prod` = common.

## Run

Needs `jq`.

```bash
./build-ig.sh                # -> dist/custom-ig.tgz
./build-init-bundle.sh dev   # -> dist/init-bundle.json (common + dev)
docker compose up            # Aidbox loads it at startup; activate on first launch
```

Build another environment: `./build-init-bundle.sh prod` (common only, no demo).

## How it works

`build-init-bundle.sh <env>` collects the `*.json` under `common/` and `<env>/`
and `jq`-wraps each into one `batch` bundle:

- **`PUT <type>/<id>`**, idempotent — Aidbox de-dupes identical PUTs, so a re-run
  is a no-op and doesn't grow history.
- **Ordering = directory number** (`common/` is 00–04, env data 05+): `00_packages`
  (custom IG) and `01_StructureDefinition` (custom types) run first; env data last.
- **A `Parameters` resource** is a package install → `POST $fhir-package-install`
  (bundle-relative url, *not* `/fhir/$fhir-package-install`).

## Packages

- **Published IGs (us.core)** → `BOX_BOOTSTRAP_FHIR_PACKAGES` in
  `docker-compose.yaml`. Runs **only on first startup** (fresh DB).
- **Local custom IG** → built by `build-ig.sh`, installed in the bundle via
  `$fhir-package-install` (`file://` to the mounted `.tgz`). Its `MyOrgPatient`
  profile derives from `us-core-patient`.

## Custom resource type

`common/01_StructureDefinition/clinical-snippet.json` defines `ClinicalSnippet`
(`derivation: specialization` → its own table). It's registered **and** an
instance seeded in the same bundle (verified: `GET /fhir/ClinicalSnippet/snippet-welcome`).

## Notes

- **Secrets / per-env values** are out of scope — a committed bundle must not
  carry secrets. Inject them at container start; see
  [init-bundle-env-template](../init-bundle-env-template/).
- **Delivering the bundle to a pod** (image / ConfigMap / init container / URL):
  see the [init bundle docs](https://www.health-samurai.io/docs/aidbox/configuration/init-bundle).
- **CI** (`.github/workflows/build-init-bundle.yml`) is illustrative — GitHub
  only runs workflows at the repo root, so copy it there. It just builds the IG
  and one bundle per environment and uploads `dist/`.

`dist/` is generated (`.gitignore`d); commit `ig/`, `common/`, `dev/`, `qa/`,
`prod/`, and the two build scripts.
