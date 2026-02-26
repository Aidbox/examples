# aidbox-forms-renderer-offline-mode

## Overview

### What this example is
This is a minimal, single-page demo that shows how to render and fill Aidbox Forms with offline support using the <aidbox-forms-renderer> web component and a custom fetch interceptor (`enable-fetch-proxy` + `onFetch`).

### Who it’s for
Teams building caregiver apps where a form can be opened and filled without internet, and then synced to Aidbox when connectivity returns.

### Offline behavior
Previously loaded forms can be opened from the local cache
Changes are autosaved locally while offline
Save and submit requests are queued and synchronized when connectivity is restored

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
- An Aidbox instance is running localy (e.g. at `http://localhost:8081`).
- FHIR resources (Patient, Questionnaires, and pre-created QuestionnaireResponses) are added to the Aidbox instance
- A JWT token with access to the FHIR and SDC APIs is created (see [Aidbox Client Credentials documentation](https://www.health-samurai.io/docs/aidbox/tutorials/security-access-control-tutorials/client-credentials-grant):
    - Go to /ui/console#/iam/sandbox/client.
    - Check the JWT checkbox.
    - Specify the client id and client secret. The default credentials are `client_id=basic`, `secret=secret` (you may replace them with any other valid values. Throughout the documentation, this pair is referred to as client:secret. Use the values you provided in the request)
    - In the sandbox console, execute the API requests by clicking Run for each call sequentially.
    - Copy the JWT from the Access token field.   
- QuestionnaireResponses must be created upfront on the server with:
    - `status: in-progress`
    - `questionnaire` reference pointing to a Questionnaire canonical URL
    - `subject` reference pointing to the patient (e.g. `Patient/pt-1`)

## Setup

1. Open `index.html` in a text editor
2. Set `AIDBOX_BASE_URL` to your Aidbox instance URL (e.g. `http://localhost:8081`) and adjust `renderer-webcomponent.js` link on line 9 (example: `http://localhost:8081/static/aidbox-forms-renderer-webcomponent.js`)
3. Set `AIDBOX_TOKEN` to a valid JWT token
4. Set `PATIENT_ID` to the patient whose assigned forms should be loaded
5. Load the fixture data into Aidbox:
   ```bash
   ./fixtures/load-fixtures.sh http://localhost:8081 client:secret
   ```
6. Serve `index.html` via any HTTP server (e.g. `npx serve .`) and open generated link in a browser (e.g. `http://localhost:3000`)

## Usage

1. **First load (online)** — the app fetches assigned QuestionnaireResponses and their Questionnaires, caches them in `localStorage`
2. **Select a form in left panel** — click on a form in the sidebar; status shows "in-progress" or "completed"
3. **Fill out forms** — changes auto-save to both `localStorage` and the server
4. **Submit a form** — status changes to "completed" in the sidebar
5. **Go offline** (e.g. DevTools Network → Offline) — forms render from cache; saves and submits are stored locally and added to a pending queue.
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

### Limitations & data safety notes
1. Local-only storage: this demo stores cached data and pending operations in localStorage on the current device/browser.
2. Multiple devices: changes made on one device are not shared with another device. Only the first successful submission will be accepted — avoid filling the same form on multiple devices.
3. Clearing browser data: if the user clears site data (history/storage) or uses private/incognito mode, offline drafts and cached forms may be lost.

### Troubleshooting

1. I don’t see any forms in the sidebar:
    - Confirm fixtures are loaded and the patient has assigned QuestionnaireResponses.
    - Confirm PATIENT_ID matches the subject.reference in those QuestionnaireResponses.
    - Confirm your JWT token has permissions to read QuestionnaireResponses and Questionnaires.
    - Confirm you didn't include "Bearer" to the name of the token (`Bearer <token>`).
2. The form works online but not offline
    - Make sure you opened the page online at least once before going offline.
    - Open the browser devtools and check that cached resources exist in localStorage.
    - Submission requires connectivity; go back online and click Submit again (or wait for auto-sync).
3. The ./fixtures/load-fixtures.sh http://localhost:8081 client:secret command stalls 
    - Verify the client_id and the client secret in client:secret are correct.
    - Verify the Aidbox base URL is correct and reachable (e.g. `http://localhost:8081`).
    - Ensure you run the script from the correct working directory — the one that contains `index.html` (so relative paths used by the script resolve correctly).
4. The renderer doesn't load
    - Ensure the Aidbox instance URL is correctly specified in `index.html` (line 9) and points to the renderer bundle (e.g. `http://localhost:8081/static/aidbox-forms-renderer-webcomponent.js`)
    - Validate the URL format:
        It should be the full absolute URL with the correct scheme (http) and port.
        Make sure that the link to the renderer bundle contains the correct http type.
