# ADR-005: Delivery surfaces &amp; strict SMART Health Cards conformance

## Status
Accepted

## Context
The original example issued a `verifiableCredential` from `$health-cards-issue` and published a JWKS,
but its cards did **not** pass strict verification, and it implemented only one of the delivery
surfaces for SMART Health Cards. We want cards that validate (e.g. at
`demo-portals.smarthealth.cards`) and all three delivery surfaces: FHIR API, QR, and file.

## Decision

### A. Conformance fixes (cards must verify)
1. **Real DEFLATE before signing.** `jose.SignJWT` sets `zip:"DEF"` in the header but does **not**
   compress the JWS payload, so the old card advertised compression it never applied. We now
   `deflateRawSync` the minified payload and sign the bytes with `CompactSign`
   (`{ alg:'ES256', zip:'DEF', kid }`). (`src/utils/crypto.ts`)
2. **`kid` = RFC 7638 JWK thumbprint.** Previously `kid` was `SHA-256(PEM)[:16]`. Now
   `generate-keys.ts` sets `kid = calculateJwkThumbprint(jwk)`, writes it into the JWK, and
   `config.ts` reads `kid` **from the JWK file** so the signing `kid` always equals the published one.
3. **`resource:N` references.** `bundle-builder.ts` now sets `entry.fullUrl = "resource:i"` and rewrites
   every `Reference.reference` that targets a bundled resource to `resource:i`, in addition to stripping
   `id`/`meta`/`text`/`Coding.display`.
4. **`iss` matches the JWKS location.** Was `https://example.org/health-cards` while the key was served
   at `…/health-cards-app/.well-known/jwks.json`. Now `HEALTH_CARDS_ISSUER =
   http://localhost:8080/health-cards-app`, so `<iss>/.well-known/jwks.json` resolves to the key.
5. **Public, CORS-enabled JWKS.** The `well-known-jwks` App op gained an inline `allow` policy so
   verifiers can fetch it unauthenticated; the app's Express `cors()` covers the same-origin route the
   browser verifier uses.
6. **`includeIdentityClaim` is a string.** The operation defines it as a repeating string of claim paths
   (e.g. `"Patient.name"`); we read `valueString` (tolerating the old boolean) and include exactly the
   named claims.

### B. JWKS hosting decision
Aidbox already serves its **own** `/.well-known/jwks.json` (RSA keys for OAuth/OIDC token signing) and
owns that route; those keys are the wrong type for SHC (which needs EC/ES256). We therefore keep the
existing design of **namespacing** the SHC JWKS under the app path
(`["health-cards-app",".well-known","jwks.json"]`) and set `iss` to that base. This avoids the
collision, keeps a single public host (Aidbox), and makes `<iss>/.well-known/jwks.json` correct.

### C. Delivery surfaces
- **QR** (`src/utils/shc-encode.ts#toQrNumeric`): the `shc:/` numeric encoding (`Ord(c)-45`, two
  digits; single chunk — multi-chunk is deprecated). The viewer renders it with a self-contained
  byte-mode QR encoder; cards too large for byte-mode fall back to the file/JWS, with a note that
  production issuers emit numeric-mode QR.
- **File** (`toFileBody` + `GET /download`): `application/smart-health-card`,
  body `{ "verifiableCredential": [ "<JWS>" ] }`, `.smart-health-card` filename.
- **Verifier viewer** (`src/viewer.html`): WebCrypto ES256 verification against the JWKS +
  `DecompressionStream('deflate-raw')` to inflate, rendering the Bundle with a verified badge.
- **Pipeline refactor**: the fetch → minimize → sign steps moved into
  `HealthCardService.issueForPatient`, shared by the Aidbox handler, `/demo/issue`, and `/download`.

### D. Both credential styles
Accept the `https://smarthealth.cards#covid19` VCI type (→ COVID Immunizations by CVX code) **and** the
generic HL7-IG resource-type form (`Immunization`, `Observation`).

### E. VCI content profiles — align, don't enforce
The VCI / US Public Health vaccine-credential profiles constrain the bundle **content** (profiles on
Patient, Immunization, and COVID lab-result Observation). We align by **resource type + codes**
(CVX / LOINC+SNOMED), and the seed data is shaped accordingly, but we deliberately **do not** validate
against those `StructureDefinition`s or trim to their minimal data set — that is out of scope for this
example. (SHC strips `meta`, so conformance is about the element set, not a `meta.profile` tag.)
Enforcement path if needed: load the IG package into Aidbox and `$validate` the issued bundle.

### F. resourceLink (OUT) — implemented
The operation returns a `resourceLink` per bundled resource, mapping each minified `resource:N` entry
to the live FHIR URL it came from (`bundledResource` → `hostedResource`, `vcIndex` = 0). The mapping is
already built during minification (`bundle-builder` refMap), so it is surfaced directly; `hostedResource`
is the issuer origin + `/fhir`. This supersedes ADR-003's out-of-scope note.

### G. credentialValueSet (IN) — implemented
Resources are filtered by content: a resource is kept only if its code (`Immunization.vaccineCode` /
`Observation.code`) is a member of the given ValueSet, checked via Aidbox `ValueSet/$validate-code`.
The ValueSet comes from a real FHIR package — `hl7.fhir.uv.shc-vaccination#1.0.0` loaded through
`BOX_BOOTSTRAP_FHIR_PACKAGES` (packages are `:`-separated) — which provides `immunization-all-cvx`.
No hand-authored ValueSet. This supersedes ADR-003's out-of-scope note.

## Consequences
- **Positive**: cards pass strict validation; all three delivery surfaces are demonstrated; JWKS is
  correct and reachable; issuance logic is shared and testable.
- **Trade-offs**: local `iss` is `http://localhost` (spec wants https + no trailing slash) and the
  issuer is not VCI-listed — both are documented local-dev deviations. The inline QR is byte-mode only.

## References
- [SMART Health Cards Framework](https://spec.smarthealth.cards/)
- [OperationDefinition: $health-cards-issue](https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/OperationDefinition-patient-i-health-cards-issue.html)
- [RFC 7638 — JWK Thumbprint](https://www.rfc-editor.org/rfc/rfc7638)
- [VCI Directory](https://github.com/the-commons-project/vci-directory)
