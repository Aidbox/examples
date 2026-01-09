---
features: [Custom renderer, Forms builder, Questionnaire, Template, Customization]
languages: [JavaScript]
---
# Custom Renderer Tutorial for Aidbox Forms Builder

This tutorial demonstrates how to connect a custom renderer to the Aidbox Forms Builder preview.

## Overview

The Aidbox Forms Builder allows you to use custom renderers to display questionnaires with your own UI components. This example shows how to:

1. Wrap your renderer as a web component
2. Host and configure it with Aidbox
3. Use it in the Forms Builder preview

## Prerequisites

- Docker and Docker Compose
- Aidbox license (get one from [Aidbox Console](https://aidbox.io))

## Tutorial

### Step 1: Clone and Configure

```bash
git clone <this-repo>
cd aidbox-forms-builder-custom-renderer
cp .env.example .env
# Add your AIDBOX_LICENSE to .env
```

### Step 2: Build the Smartforms Component

This example includes a CSIRO Smartforms renderer wrapped as a web component. Build it first:

```bash
cd smartforms-component
npm install
npm run build
cd ..
```

### Step 3: Wrap Your Renderer for Forms Builder Compatibility

The Forms Builder expects a specific web component structure. Use the provided template `custom-renderer.template.js`:

```javascript
// simple-questionnaire-renderer.js
if(!customElements.get("simple-questionnaire-renderer")) {

class SimpleQuestionnaireRenderer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._questionnaire = null;
    this._questionnaireResponse = null;
    this._onQuestionnaireResponseChange = null;
  }

  static get observedAttributes() {
    return ['questionnaire', 'questionnaire-response'];
  }

  // Handle attribute updates from Forms Builder
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.shadowRoot || oldValue === newValue) return;

    try {
      const parsed = newValue ? JSON.parse(newValue) : null;
      if (name === 'questionnaire') this._questionnaire = parsed;
      if (name === 'questionnaire-response') this._questionnaireResponse = parsed;
      this.render();
    } catch (e) {
      console.error(`Invalid JSON for ${name}:`, e);
    }
  }

  // Property accessors
  get questionnaire() { return this._questionnaire; }
  set questionnaire(value) { this._questionnaire = value; this.render(); }

  get questionnaireResponse() { return this._questionnaireResponse; }
  set questionnaireResponse(value) { this._questionnaireResponse = value; this.render(); }

  set onQuestionnaireResponseChange(callback) {
    this._onQuestionnaireResponseChange = callback;
  }

  render() {
    if (!this.shadowRoot) return;
    // Implement your questionnaire rendering here
  }
}

customElements.define('simple-questionnaire-renderer', SimpleQuestionnaireRenderer);
}
```

The only required attribute is `questionnaire`. 
Support `questionnaire-response` to receive populated QuestionnaireResponse.
Support `onQuestionnaireResponseChange` if you want to send QuestionnaireResponse back to the builder. 

This tutorial includes `simple-questionnaire-renderer.js`, a reference implementation that renders FHIR Questionnaires using native HTML inputs.

### Step 4: Host Your Renderer

The web component must be accessible via URL. This tutorial uses Caddy to serve the renderer files:

```dockerfile
# Dockerfile
FROM caddy:alpine
COPY Caddyfile /etc/caddy/Caddyfile
WORKDIR /srv
COPY ./smartforms-component/dist/aidbox-forms-renderer-csiro-webcomponent.js /srv/
COPY ./simple-questionnaire-renderer.js /srv/
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
```

### Step 5: Configure Aidbox

To register custom renderers with Aidbox Forms, update the `SDCConfig` resource.

Each renderer in the `custom-renderers` array requires:
- **`name`** - The HTML tag name of your web component (e.g., `simple-questionnaire-renderer`)
- **`source`** - URL where the renderer JavaScript file is hosted
- **`title`** - Display name shown in the Forms Builder renderer dropdown

Create an initialization bundle (`init-bundle.json`) to configure the custom renderers:

```json
{
  "resourceType" : "Bundle",
  "type" : "transaction",
  "entry" : [ {
    "resource" : {
      "resourceType" : "SDCConfig",
      "name": "custom-renderers-config",
      "default": true,
      "id" : "custom-renderer-config",
      "builder": {
        "custom-renderers": [
          {
            "name" : "aidbox-form-csiro-renderer",
            "source" : "http://localhost:8081/aidbox-forms-renderer-csiro-webcomponent.js",
            "title" : "CSIRO"
          },
          {
            "name" : "simple-questionnaire-renderer",
            "source" : "http://localhost:8081/simple-questionnaire-renderer.js",
            "title" : "Simple Questionnaire Renderer"
          }
        ]
      }
    },
    "request" : {
      "method" : "PUT",
      "url" : "SDCConfig/custom-renderer-config"
    }
  }]
}
```

### Step 6: Start Services

```bash
docker-compose up -d --pull always --build
```

### Step 7: Use in Forms Builder

1. **Access Forms Builder:** Go to http://localhost:8080 and navigate to Forms Builder
2. **Create/Edit Questionnaire:** Use the visual editor to build your form
3. **Preview with Custom Renderer:** In the preview section, select your custom renderer from the dropdown
4. **Test:** The preview will use your custom renderer instead of the default one

**Service URLs:**
- Aidbox: http://localhost:8080
- Custom renderer demo: http://localhost:8081

## Troubleshooting

### Common Issues

1. **Renderer not appearing in Forms Builder:**
   - Check SDCConfig is properly loaded
   - Verify renderer URL is accessible
   - Check browser console for loading errors

2. **Response not updating:**
   - Ensure `onQuestionnaireResponseChange` callback is called
   - Check QuestionnaireResponse structure matches FHIR spec
   - Verify event listeners are attached to form inputs

3. **CORS issues:**
   - Ensure renderer URL is accessible from Forms Builder domain
   - Check network tab for failed requests

### Debug Steps

1. Check Aidbox logs: `docker-compose logs aidbox`
2. Verify SDCConfig: `GET http://localhost:8080/SDCConfig/custom-renderer-config`
3. Test renderer directly: http://localhost:8081/simple-questionnaire-renderer.js
4. Check browser console in Forms Builder for errors

This example provides a complete foundation for integrating custom renderers that work seamlessly with the Aidbox Forms Builder.