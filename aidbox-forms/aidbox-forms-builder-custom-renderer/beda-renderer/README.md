---
features: [Custom renderer, Forms builder, Questionnaire, SDC QRF, SMART Web Messaging]
languages: [TypeScript]
---
# beda-renderer

This package builds a static renderer page (`index.html` + `src/index.tsx`) that mounts the Beda FHIR Questionnaire renderer and speaks [SDC SMART Web Messaging](https://github.com/brianpos/sdc-smart-web-messaging).

Renderer source: https://github.com/beda-software/fhir-questionnaire (uses `sdc-qrf` under the hood).

To install dependencies:

```bash
pnpm install
```

To run a dev server:

```bash
pnpm dev
```

To build static assets:

```bash
pnpm build
```
