# Project Overview

This project implements **time-bounded, field-redacted assessment sharing between provider organizations** in TypeScript on the [Bun](https://bun.sh) runtime, integrated with Aidbox, using **SMART Health Links (SHL)** as the transport. Provider Organization A records GAD-7 assessments for a patient and grants Provider Organization B a link that resolves only inside a date window, and only to the questionnaire items A chose to share. The implementation should be minimal and focused on core functionality.

## The central design decision

Unlike a snapshot-style SHL, **nothing is encrypted at mint time**. An `AssessmentShare` stores only a *policy* (patient, questionnaire, window, hidden items). Every manifest poll re-queries live assessments, re-applies the redaction, and encrypts the result fresh. Three requirements fall out of that one choice:

- **live** — assessments A completes after minting appear on B's next poll, with no re-minting;
- **closable** — the window is evaluated at read time, so the end date closes access on its own and an early revoke is immediate; there is no pre-encrypted copy to claw back;
- **retroactively redactable** — tightening `hiddenItems` applies to a link already sent.

The seam is `ContentProvider` in `src/services/share-service.ts`: the protocol engine knows nothing about assessments and asks for bytes on each read.

## Architecture

- **FHIR Server**: Aidbox with custom operation routing (Aidbox Apps) and an `AssessmentShare` custom resource
- **Application**: Bun + TypeScript service (no build step — Bun runs TS directly)
- **Integration**: Aidbox proxies App operations to the service; the service calls back into Aidbox via the FHIR API
- **Content**: a FHIR searchset `Bundle` of redacted `QuestionnaireResponse`s, encrypted as a JWE (`alg: dir`, `enc: A256GCM`)
- **UI**: a browser page (`src/app.html`, served at `GET /`) with four roles — record a GAD-7, share it, manage shares, open a link. The fourth is a real SHL receiver that decrypts client-side with WebCrypto; `SHL_VIEWER_URL` is wired to it so minted links open it prefilled.
- **Form rendering**: the GAD-7 intake form is a React island (`src/forms/intake.tsx`) rendered by [`@formbox/renderer`](https://github.com/HealthSamurai/formbox-renderer) with `@formbox/hs-theme` — the same renderer [HealthSamurai/phr](https://github.com/HealthSamurai/phr) uses. `Bun.build()` compiles it at server startup, so there is still no separate build command; the other three tabs remain plain no-build HTML.
- **Palette**: light, drawn from `@formbox/hs-theme`'s slate/blue ramp so the rendered form belongs to the page rather than sitting in its own white box. Defined as tokens on `:root` in `src/app.html`; components style through the tokens, so the palette is changed in one place. Colors carry meaning and are not interchangeable: `--accent` (blue) marks what happens *in the browser* (decryption, the key), `--server` (violet) what the backend does, `--locked` (amber) a withheld or pending thing, `--danger` a closed one. All pairs pass WCAG AA for normal text — the previous mint accent scored ~1.5:1 on white, which is why that role moved to blue rather than being kept.

## Key Resources

### Specification
- **SMART Health Links IG**: https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/links-specification.html
- **Flags used**: `L` (long-term). Optional: `P` (passcode). Not used: `U` (direct file).
- A share is never `finalized` — it is `can-change` while open (contents evolve), then `no-longer-valid`.

### Aidbox Integration
- **Init Bundle**: `init-bundle/bundle.json` — Client, AccessPolicy, the `AssessmentShare` StructureDefinition, the `share-app` App with four operations, the GAD-7 `Questionnaire` + terminology, two `Organization`s and a demo `Patient`.
- **App Resource**: routes `$create`, `$revoke`, `manifest/{shareId}`, and `file/{fileId}` to the Bun service. Create and revoke are authenticated; manifest and file are public via an inline `allow` policy. See [Aidbox Apps](https://www.health-samurai.io/docs/aidbox/app-development/aidbox-sdk/apps).
- **Custom Resource**: `AssessmentShare` persists one sharing grant (parties, window, hidden items, passcode state, file tokens, access log).

## Development Commands

```bash
bun install        # install dependencies
bun run dev        # watch mode (bun --watch)
bun run start      # run once
bunx tsc --noEmit  # type-check
docker compose up --build   # full stack (Aidbox + app)
```

The app is published on **port 3100** (Aidbox on 8080) to stay clear of the common 3000 default.

## Project Scope

- **Backend + a self-contained demo UI**: the focus is the backend sharing flow; `src/app.html` is a single-file browser app (no build, no framework) included to exercise it end to end.
- **Core functionality**: capture GAD-7 responses, create a share (window + item redaction), resolve the manifest against live data, decrypt client-side, revoke early, and audit reads.
- **Runtime**: Bun (native `Bun.serve` HTTP, auto-loaded `.env`, direct TypeScript execution — no `tsc`/`ts-node`/`nodemon`).
- **FHIR access**: the official `@health-samurai/aidbox-client` (Basic auth via `BasicAuthProvider`, typed `AidboxClient` returning a `Result`).

## Notable implementation details

- **Score leakage**: a GAD-7 total is the sum of its items, so publishing it next to a hidden item leaks that answer. `redactResponse` recomputes the score from *visible* items whenever anything scored was hidden, and `shareScore: false` drops it entirely. See `src/services/redaction.ts`.
- **Masked, not missing**: a hidden item keeps its `linkId` and text but loses its answer and gains a `masked` data-absent-reason, so a receiving clinician can distinguish "withheld" from "unanswered".
- **File tokens freeze their ciphertext**: because content is rebuilt per read, a `location` URL must serve the exact bytes its manifest advertised — so the JWE is stored on the token, not regenerated.
- **`QuestionnaireResponse.author`** (not `.source`) scopes a share to the sharing organization's own assessments. FHIR restricts `source` to a *person* (`Patient | Practitioner | PractitionerRole | RelatedPerson`) and Aidbox's schema validation rejects an `Organization` there; `author` admits one, and the spec states that responses "authored by other collections of people must use Organization". It also has a stock search parameter, so the scoping is pushed into the Aidbox query rather than filtered in memory.
- **FHIR rejects empty arrays.** `hiddenItems` and `fileTokens` are omitted rather than written as `[]` — worth knowing, since the natural `?? []` default makes every write of an unhidden share fail validation.
- **The GAD-7 uses inline `answerOption`, not `answerValueSet`.** Aidbox's hybrid terminology engine returned an empty expansion for the stored ValueSets (expanding the same `compose` inline worked, so the concept-level filter wasn't honored), and `ValueSet/$expand` requires auth the browser doesn't have. Inline options sidestep both: the renderer needs no terminology round trip and no credentials. The `CodeSystem`/`ValueSet` resources remain in the init bundle as the terminology of record.
- **The form is the single source of truth for the instrument.** `/demo/intake-form` serves `Questionnaire/gad7` straight from Aidbox, and the share tab's redaction checkboxes are built from the same resource — so adding an item to the instrument surfaces in both the form and the hide-list without a code change. `GAD7_ITEMS` in `types/gad7.ts` now only backs scoring and the API/seed path.
- **`submitGad7` never trusts the client.** It accepts either the renderer's `item[]` or coded answers, then rebuilds items from `GAD7_ITEMS` and stamps `author`, `status` and the score server-side. Unknown linkIds and codes are dropped, so a browser cannot widen the instrument or assert its own total.
