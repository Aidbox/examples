# Project Overview

This project implements **SMART Health Links (SHL)** in TypeScript on the [Bun](https://bun.sh) runtime, integrated with Aidbox. It securely shares the result of a long-running **real-time eligibility (RTE)** check with an **unauthenticated** client: the client kicks off the check, receives a `shlink:` carrying an encryption key, polls a manifest until the result is ready, then decrypts it. The SHL key is the only secret — the server stores only ciphertext. The implementation should be minimal and focused on core functionality.

## Architecture

- **FHIR Server**: Aidbox with custom operation routing (Aidbox Apps) and a `SHLink` custom resource
- **Application**: Bun + TypeScript service (no build step — Bun runs TS directly)
- **Integration**: Aidbox proxies App operations to the service; the service calls back into Aidbox via the FHIR API
- **Output**: A FHIR `CoverageEligibilityResponse`, encrypted as a JWE (`alg: dir`, `enc: A256GCM`)
- **Viewer**: a self-contained browser page (`src/viewer.html`, served at `GET /`) that resolves a `shlink:` and decrypts it client-side with WebCrypto — the realistic SHL receiver. `SHL_VIEWER_URL` is wired to it so minted links open it prefilled.

## Key Resources

### Specification
- **SMART Health Links IG**: https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/links-specification.html
- **Flags used**: `L` (long-term). Not used: `P` (passcode), `U` (direct file).

### Aidbox Integration
- **Init Bundle**: `init-bundle/bundle.json` — Client, AccessPolicy, `SHLink` StructureDefinition, and the `shl-app` App with three operations (kickoff is authenticated; manifest and file are public via an inline `allow` policy).
- **App Resource**: routes `$kickoff`, `manifest/{shlId}`, and `file/{fileId}` to the Bun service. See [Aidbox Apps](https://www.health-samurai.io/docs/aidbox/app-development/aidbox-sdk/apps).
- **Custom Resource**: `SHLink` persists per-link state (key, jobStatus, encrypted file).

## Development Commands

```bash
bun install        # install dependencies
bun run dev        # watch mode (bun --watch)
bun run start      # run once
bunx tsc --noEmit  # type-check
docker compose up --build   # full stack (Aidbox + app)
```

## Project Scope

- **Backend only**: no frontend UI.
- **Core functionality**: mint SHL, async RTE job, manifest lifecycle (can-change → finalized), encrypted file delivery, decryption.
- **Runtime**: Bun (native `Bun.serve` HTTP, auto-loaded `.env`, direct TypeScript execution — no `tsc`/`ts-node`/`nodemon`).
- **FHIR access**: the official `@health-samurai/aidbox-client` (Basic auth via `BasicAuthProvider`, typed `AidboxClient` returning a `Result`), as in `aidbox-features/aidbox-orchestration-service`.
