---
features: [Custom renderer, Forms builder, Questionnaire, Template, Customization]
languages: [JavaScript]
---
# Custom Renderer Tutorial for Aidbox Forms Builder

This tutorial demonstrates how connect a custom renderer to the Aidbox Forms Builder preview.

## Overview

The Aidbox Forms Builder allows you to use custom renderers to display questionnaires with your own UI components. This example shows how to:

1. Wrap your renderer to webcomponent
2. Host and configure it with Aidbox
3. Use it in the Forms Builder preview

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Aidbox license (get one from [Aidbox Console](https://aidbox.io))

### Setup

1. **Clone and configure:**
   ```bash
   git clone <this-repo>
   cd aidbox-forms-builder-custom-renderer
   cp .env.example .env
   # Add your AIDBOX_LICENSE to .env
   ```

2. **Build the smartforms component:**
   ```bash
   cd smartforms-component
   npm install
   npm run build
   cd ..
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the services:**
   - Aidbox: http://localhost:8080
   - Custom renderer demo: http://localhost:8081

## Tutorial Steps

### Step 2. Wrap your renderer for Forms Builder Compatibility

The Forms Builder expects a specific web component structure. Use the provided template:

```javascript
// wrapped-questionnaire-renderer.js
if(!customElements.get("questionnaire-custom-renderer")) {

class QuestionnaireCustomRenderer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._questionnaire = null;
    this._questionnaireResponse = null;
    this._onQuestionnaireResponseChange = null;
  }

  // Must implement these exact methods:
  set onQuestionnaireResponseChange(callback) {
    this._onQuestionnaireResponseChange = callback;
  }

  // Your custom rendering logic goes in render()
  render() {
    // Implement your questionnaire rendering here
  }
}

customElements.define('questionnaire-custom-renderer', QuestionnaireCustomRenderer);
}
```

The only required attribute is `questionnaire`. 
Support `questionnaire-response` to receive populated QuestionnaireResponse.
Support `onQuestionnaireResponseChange` if you want to send QuestionnaireResponse back to builder. 

In this tutorial we will use `simple-questionnaire-renderer.js`

### Step 3: Host Your Renderer

Webcomponent should be accessible publicly. 

In this tutorial we create a simple web server to host your renderer:

```dockerfile
# Dockerfile
FROM caddy:alpine
COPY Caddyfile /etc/caddy/Caddyfile
WORKDIR /srv
COPY ./smartforms-component/dist/aidbox-forms-renderer-csiro-webcomponent.js /srv/
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
```

### Step 4: Configure Aidbox

To tell aidbox forms there are other renderers update the SDCConfif resource.

Create an initialization bundle to configure the custom renderer:

```yaml
# init-bundle.yaml
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
        "custom-renderers": [{
          "name" : "simple-questionnaire-renderer",
          "source" : "http://localhost:8081/simple-questionnaire-renderer.js",
          "title" : "Simple Questionnaire Renderer"
        }]
      }
    },
    "request" : {
      "method" : "PUT",
      "url" : "SDCConfig/custom-renderer-config"
    }
  }]
}
```

## Using in Forms Builder

1. **Access Forms Builder:** Go to http://localhost:8080 and navigate to Forms Builder
2. **Create/Edit Questionnaire:** Use the visual editor to build your form
3. **Preview with Custom Renderer:** In the preview section, select your custom renderer from the dropdown
4. **Test:** The preview will use your custom renderer instead of the default one


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
3. Test renderer directly: http://localhost:8081/wrapped-questionnaire-renderer.js
4. Check browser console in Forms Builder for errors


This example provides a complete foundation for integrating custom renderers that work seamlessly with the Aidbox Forms Builder.