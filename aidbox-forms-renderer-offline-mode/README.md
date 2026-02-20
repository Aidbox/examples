# aidbox-forms-renderer-offline-mode

Example of using the Aidbox Forms Renderer web component with offline support via request interception (`enable-fetch-proxy` + `onFetch`).

## How it works

This example uses a **response-centric (task-based) model**: QuestionnaireResponses are created upfront on the server (by an admin, workflow, or scheduler) and represent assigned forms that the user must fill out. The sidebar shows these pre-created QRs as the work list.

The `<aidbox-form-renderer>` web component supports a fetch proxy mode where all HTTP requests are intercepted by a custom `onFetch` handler. This example uses that mechanism to:

1. **Load assigned forms** — on startup, the app searches for QuestionnaireResponses assigned to the current patient, then fetches their referenced Questionnaires
2. **Cache FHIR resources in `localStorage`** — Questionnaires, QuestionnaireResponses, and themes are stored locally
3. **Serve forms from cache** — when offline (or always, for cached resources), the interceptor returns data from `localStorage` instead of making network requests
4. **Queue changes when offline** — saves and submissions are written to `localStorage` immediately and queued as pending operations
5. **Sync automatically on reconnect** — when the browser comes back online, pending operations are pushed to the Aidbox server in order

## Architecture

Single `index.html` file using CDN-loaded dependencies (React 18, Babel standalone, Tailwind CSS, aidbox-forms-renderer-webcomponent.js).

### Key parts

| Part | Purpose |
|------|---------|
| **Configuration** | `AIDBOX_BASE_URL`, JWT token, patient ID, QR search params, default SDC config |
| **OfflineStorage** | `localStorage` wrapper with namespaced keys; emits custom events on changes |
| **apiFetch()** | HTTP helper that prepends base URL and Bearer token |
| **loadInitialData()** | Searches for assigned QRs with `_include` for Questionnaires, caches everything |
| **syncPendingChanges()** | Processes queued save/submit operations when back online |
| **createFetchInterceptor()** | `onFetch` handler — serves cached resources, queues writes when offline |
| **App** | React component — sidebar with form list, status bar, form renderer |

### Request interceptor tags

The `onFetch` handler routes requests by `init.tag`:

| Tag | Behavior |
|-----|----------|
| `get-config` | Returns `DEFAULT_SDC_CONFIG` from memory |
| `get-theme` | Returns cached theme, or delegates to renderer if online (this demo uses the default theme for brevity) |
| `get-questionnaire` | Returns cached Questionnaire, or delegates to renderer if online |
| `get-response` | Returns cached QuestionnaireResponse, or delegates to renderer if online |
| `save-response` | Saves locally, forwards to server if online, queues if offline |
| `submit-response` | Marks completed locally, forwards to server if online, queues if offline |
| _(untagged)_ | Delegates to renderer if online, returns 503 if offline |

When the interceptor returns `null`, the renderer handles the request itself (using the `token` attribute for auth).

### localStorage key schema

| Key pattern | Content |
|-------------|---------|
| `aidbox-offline:questionnaire:{canonical}` | Cached Questionnaire resource |
| `aidbox-offline:response:{id}` | Cached QuestionnaireResponse resource |
| `aidbox-offline:response-list` | Array of `{responseId, questionnaire, status}` |
| `aidbox-offline:theme:{id}` | Cached theme resource |
| `aidbox-offline:pending-ops` | Array of queued save/submit operations |

### Custom events

`OfflineStorage` emits events on `window` to notify the React app of changes:

| Event | Trigger |
|-------|---------|
| `offline-responses-changed` | Response list updated |
| `offline-pending-changed` | Pending ops queue updated |

## Prerequisites

- An Aidbox instance with FHIR resources loaded (Patient, Questionnaires, and pre-created QuestionnaireResponses)
- A JWT token with access to the FHIR and SDC APIs
- QuestionnaireResponses must be created upfront on the server with:
  - `status: in-progress`
  - `questionnaire` reference pointing to a Questionnaire canonical URL
  - `subject` reference pointing to the patient (e.g. `Patient/pt-1`)

## Setup

1. Open `index.html` in a text editor
2. Set `AIDBOX_BASE_URL` to your Aidbox instance URL (e.g. `http://localhost:8081`)
3. Set `AIDBOX_TOKEN` to a valid JWT token
4. Set `PATIENT_ID` to the patient whose assigned forms should be loaded
5. Load the fixture data into Aidbox:
   ```bash
   ./fixtures/load-fixtures.sh http://localhost:8081 basic:secret
   ```
6. Serve `index.html` via any HTTP server (e.g. `npx serve .`) and open in a browser

## Usage

1. **First load (online)** — the app fetches assigned QuestionnaireResponses and their Questionnaires, caches them in `localStorage`
2. **Select a form** — click on a form in the sidebar; status shows "in-progress" or "completed"
3. **Fill out forms** — changes auto-save to both `localStorage` and the server
4. **Submit a form** — status changes to "completed" in the sidebar
5. **Go offline** (e.g. DevTools Network → Offline) — forms render from cache; saves are queued
6. **Come back online** — pending changes sync automatically

The header status bar shows online/offline state, pending change count, and sync progress.

## Web component attributes

| Attribute | Purpose |
|-----------|---------|
| `token` | JWT token for authenticating renderer's own requests |
| `config` | SDC configuration object |
| `questionnaire-id` | Canonical URL of the Questionnaire |
| `questionnaire-response-id` | ID of the QuestionnaireResponse to edit |
| `enable-fetch-proxy` | Enables `onFetch` interception |

The `onFetch` callback is set as a JS property via the `ref` callback.

See the [Aidbox Forms documentation](https://docs.aidbox.app/modules/aidbox-forms/aidbox-ui-builder-alpha/embedding-renderer) for the full list of attributes.
