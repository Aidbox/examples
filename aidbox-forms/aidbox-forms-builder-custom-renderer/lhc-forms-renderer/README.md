# lhc-forms-renderer

This package builds a static renderer page (`index.html` + `src/index.ts`) that
mounts LHC-Forms and speaks [SDC SMART Web Messaging](https://github.com/brianpos/sdc-smart-web-messaging).

Official renderer site: https://lhncbc.github.io/lforms/

## Run locally

```bash
pnpm install
pnpm dev
```

This renderer loads LHC-Forms via script tags from the official hosted build
(`https://lhncbc.github.io/lforms/`). If you need fully offline hosting, mirror
those assets and update `index.html` accordingly.

Then add the URL (for example `http://localhost:5173`) in Forms Builder
via **Add custom renderer**.
