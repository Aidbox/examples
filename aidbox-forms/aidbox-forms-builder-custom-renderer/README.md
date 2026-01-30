---
features: [Custom renderer, Forms builder, Questionnaire, Template, Customization]
languages: [JavaScript]
---
# Custom Renderer Tutorial for Aidbox Forms Builder

This tutorial demonstrates how to connect a custom renderer to the Aidbox Forms Builder preview.

## Overview

The Aidbox Forms Builder allows you to use custom renderers to display questionnaires with your own UI components. This example shows how to:

1. Host a renderer page that speaks [SDC SMART Web Messaging](https://github.com/brianpos/sdc-smart-web-messaging)
2. Register renderer URLs in Aidbox
3. Use them in the Forms Builder preview

## Prerequisites

- Running Aidbox

## Tutorial

### Step 1: Clone and Configure

```bash
git clone <this-repo>
cd aidbox-forms-builder-custom-renderer
cp .env.example .env
# Add your AIDBOX_LICENSE to .env
```

### Step 2: Pick a Renderer and Build It (Vite)

This repo includes renderer pages: `smart-forms-renderer` and `lhc-forms-renderer`.

```bash
cd smart-forms-renderer
pnpm install
pnpm build
```

For LHC-Forms, run the same commands from `lhc-forms-renderer`.

If you want to host the renderer elsewhere, repeat the same steps in that environment.

### Step 3: Use Renderer Pages (SDC SWM)

The Forms Builder loads a renderer by URL. The renderer page must implement [SDC SMART Web Messaging](https://github.com/brianpos/sdc-smart-web-messaging) and respond to `postMessage` requests from the host.

Each renderer page in this repo is a Vite app (`index.html` + `src/index.js`) that builds to a static `dist/` folder, mounts a renderer (SmartForms or LHC-Forms), and bridges messages to the host.

### Step 4: Host Your Renderer

The renderer page must be accessible via URL. You can use either:

1) Vite dev server (local testing):

```bash
cd smart-forms-renderer
pnpm dev
```

If you are using a different folder (e.g. `lhc-forms-renderer`), run the same command from there instead.

2) Built files hosted anywhere (for preview):

```bash
pnpm build
```

Then host the resulting `dist/` folder with any static hosting.

### Step 5: Add the Renderer in Forms Builder

Open Forms Builder and use the renderer switcher (eye icon near the theme selector).

1) Click **Add custom renderer**  
2) Enter a name and the renderer URL (for example `http://localhost:5173`)  
3) Save

### Step 6: Use in Forms Builder

1. **Access Forms Builder:** Go to http://localhost:8080 and navigate to Forms Builder
2. **Create/Edit Questionnaire:** Use the visual editor to build your form
3. **Preview with Custom Renderer:** In the preview section, select your custom renderer from the dropdown
4. **Test:** The preview will use your custom renderer instead of the default one

**Service URLs:**
- Aidbox: http://localhost:8080
- Renderer dev server: http://localhost:5173 (default Vite port)

## Troubleshooting

### Common Issues

1. **Renderer not appearing in Forms Builder:**
   - Verify the renderer URL is reachable
   - Check browser console for loading errors

2. **Response not updating:**
   - Check browser console for postMessage errors
   - Confirm renderer page receives `sdc.displayQuestionnaire`
   - Verify the renderer sends `sdc.ui.changedQuestionnaireResponse`

3. **CORS issues:**
   - Ensure renderer URL is accessible from Forms Builder domain
   - Check network tab for failed requests

### Debug Steps

1. Test renderer directly: http://localhost:5173
4. Check browser console in Forms Builder for errors

This example provides a complete foundation for integrating custom renderers that work seamlessly with the Aidbox Forms Builder.
