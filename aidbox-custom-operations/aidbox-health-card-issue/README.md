---
features: [SMART health cards, Custom operations, JWKS, JWS signing, FHIR operations]
languages: [TypeScript]
---
# SMART Health Cards Issue Operation

A Node/Express implementation of the FHIR [`$health-cards-issue`](https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/OperationDefinition-patient-i-health-cards-issue.html) operation on [Aidbox](https://www.health-samurai.io/aidbox). It pulls patient data from Aidbox, minimizes it per the [SMART Health Cards spec](https://spec.smarthealth.cards/), and issues a signed verifiable credential (JWS/ES256). The card ships three ways (FHIR API, QR `shc:/`, and a `.smart-health-card` file), with an in-browser verifier included.

A SMART Health Card is a FHIR `Bundle` wrapped as a W3C Verifiable Credential and signed as a JWS (ES256), payload minified and DEFLATE-compressed (`zip:"DEF"`). The issuer's signature proves the card is authentic; it does not keep the contents confidential. For encrypted sharing, see the sibling `smart-health-link` example.

## Architecture

```mermaid
flowchart LR
    Client["Client"]
    Aidbox["Aidbox"]
    App["Health Cards App<br/>(Node)"]

    Client -->|"$health-cards-issue"| Aidbox
    Aidbox -->|"proxies op"| App
    App -->|"fetch data"| Aidbox
    App -->|"JWS"| Aidbox
    Aidbox -->|"credential"| Client
    Client -.->|"GET JWKS"| Aidbox
    Aidbox -.->|"JWKS"| App
```

## Flow 1: Issue (`$health-cards-issue`)

```mermaid
sequenceDiagram
    actor C as Client
    participant A as Aidbox
    participant S as Health Cards App
    C->>A: POST /fhir/Patient/{id}/$health-cards-issue<br/>Parameters { credentialType, _since? }
    A->>S: proxies operation
    S->>A: GET Patient/{id}, Immunization?/Observation?
    A-->>S: FHIR resources
    Note over S: minimize (strip id/meta/text/display,<br/>fullUrl + refs → resource:N), DEFLATE, sign ES256
    S-->>A: Parameters { verifiableCredential: "<JWS>" }
    A-->>C: Parameters { verifiableCredential }
```

## Flow 2: Verify (JWKS)

The issuer publishes its public key so anyone can verify:

- Aidbox already owns its own `/.well-known/jwks.json` (RSA, for OAuth).
- The SHC EC key therefore lives under a namespaced path: `/health-cards-app/.well-known/jwks.json`.
- `iss` points at that base, so `<iss>/.well-known/jwks.json` resolves to the key.

```mermaid
sequenceDiagram
    actor V as Verifier
    participant A as Aidbox
    participant S as Health Cards App
    Note over V: read iss + kid from the JWS
    V->>A: GET <iss>/.well-known/jwks.json<br/>(iss = http://localhost:8081/health-cards-app)
    A->>S: http-rpc (operation: well-known-jwks, public)
    S-->>A: { keys: [ EC/P-256 public JWK, kid ] }
    A-->>V: JWKS (CORS)
    Note over V: pick key by kid → verify ES256 → inflate DEFLATE
```

## Flow 3: Deliver and verify in the browser

```mermaid
sequenceDiagram
    actor U as User (browser)
    participant S as Health Cards App
    U->>S: POST /demo/issue { patientId, credentialType }
    S-->>U: { verifiableCredential, qr: "shc:/…", downloadUrl }
    U->>S: GET /.well-known/jwks.json (same-origin)
    S-->>U: JWKS
    Note over U: WebCrypto ES256 verify + deflate-raw inflate → render Bundle
    U->>S: GET /download → application/smart-health-card
```

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/fhir/Patient/{id}/$health-cards-issue` | required | Issue a card |
| GET | `/health-cards-app/.well-known/jwks.json` | public | Issuer JWKS (`= <iss>/.well-known/jwks.json`) |
| GET | `:3001/` | public | Viewer (Issue + Verify) |
| POST | `:3001/demo/issue` | demo | Issue → `{ jws, qr, downloadUrl }` |
| GET | `:3001/download` | demo | `.smart-health-card` file |
| GET | `:3001/.well-known/jwks.json` | public | Same JWKS, same-origin for the viewer |

## Quick Start

```bash
cp .env.example .env
npm install && npm run generate-keys
docker compose up --build
```
Activate Aidbox at [localhost:8081](http://localhost:8081) (init bundle seeds `Patient/example-patient` + a COVID `Immunization` + `Observation`), then open the viewer at [localhost:3001](http://localhost:3001).

## Testing

- **Viewer** (`:3001`): **Issue** a card (`#covid19`, `Immunization`, or `Observation`) → get JWS, QR, and a `.smart-health-card` download, auto-verified. **Verify** any pasted JWS against the JWKS.
- **API**:
  ```http
  POST /fhir/Patient/example-patient/$health-cards-issue
  Content-Type: application/fhir+json

  { "resourceType": "Parameters",
    "parameter": [ { "name": "credentialType", "valueUri": "https://smarthealth.cards#covid19" } ] }
  ```
  Also accepts `Immunization` / `Observation` (uri or string), `_since` (dateTime), `includeIdentityClaim` (string claim paths).
- **`credentialType` mapping**: `#covid19` selects COVID `Immunization`s only (filtered by CVX vaccine code); `Immunization` selects all immunizations; `Observation` selects lab results. All matches go into a single card.
- **`resourceLink` (OUT)**: the response also returns a `resourceLink` per bundled resource, mapping each minified `resource:N` entry back to its live FHIR URL (for example, `resource:0` maps to `<fhirBase>/Patient/example-patient`).
- **`credentialValueSet` (IN)**: restricts resources by content — keeps only those whose code (`Immunization.vaccineCode` / `Observation.code`) is a member of the given ValueSet, via Aidbox `ValueSet/$validate-code`. The `hl7.fhir.uv.shc-vaccination` package (loaded through `BOX_BOOTSTRAP_FHIR_PACKAGES`) supplies `http://hl7.org/fhir/uv/shc-vaccination/ValueSet/immunization-all-cvx` for this. The seed has two immunizations (one CVX, one SNOMED), so `Immunization` + the CVX ValueSet keeps only the CVX one; `Observation` + the same ValueSet filters the LOINC lab out. Repeating IN params (`credentialType`, `credentialValueSet`, `includeIdentityClaim`) are supported — the viewer's Issue tab has `+` buttons (the last two under **Advanced**).
- **Spec validator**: paste the JWS at [demo-portals.smarthealth.cards](https://demo-portals.smarthealth.cards/). Header, `zip:DEF`, signature, `kid`, and Bundle should all read valid. Two warnings are expected in local dev (unknown issuer and http keys); paste `keys/public-key.jwk.json` to check the signature.

## Conformance

Built to pass strict verification:
- **JWS** `ES256`, `zip:DEF`, `kid` = base64url SHA-256 JWK thumbprint (RFC 7638).
- Payload minified + **raw-DEFLATE before signing** (jose `SignJWT` doesn't compress; we `deflateRaw` + `CompactSign`).
- Bundle `collection`; strip `id`/`meta`(≠security)/`text`/`Coding.display`; `fullUrl` + refs → `resource:N`.
- JWKS: EC/P-256/`use:sig`/`alg:ES256`/`kid`/`x`/`y`, **no `d`**, CORS; `iss` = the base serving it.

## VCI / trust

Real verifiers check `iss` against the [VCI trusted-issuer directory](https://github.com/the-commons-project/vci-directory) and fetch JWKS over https (TLS 1.2+). This demo self-hosts over `http://localhost` and is not VCI-listed, which is the expected local-dev deviation. Production needs an https `iss` (no trailing slash) plus VCI enrollment.

**Card content and VCI profiles.** For `#covid19`, the bundle content follows the VCI / [US Public Health](https://build.fhir.org/ig/HL7/fhir-us-ph-library/) vaccine-credential profiles by resource type and codes: Patient (name + DOB), `Immunization` (CVX vaccine code), and COVID `Observation` (LOINC code + SNOMED value). The seed data is shaped accordingly. This demo stops short of validating against those `StructureDefinition`s or trimming to their exact minimal data set, which is out of scope here. (SHC strips `meta`, so conformance means the set of elements, not a `meta.profile` tag.) To enforce it, load the IG package into Aidbox and run `$validate` on the issued bundle.

**Out of scope**: SMART-on-FHIR OAuth (Aidbox config), VCI enrollment, formal VCI/us-ph profile validation, revocation, key rotation.

## Related

- [`smart-health-link`](../../aidbox-integrations/smart-health-link): the encrypted-link counterpart (JWE), which shares data via a `shlink:` instead of a signed card.
