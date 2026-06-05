---
features: [API interception, Custom operations, Fastify, App framework, FHIR extensions]
languages: [TypeScript]
---
# Aidbox: Intercept a FHIR endpoint

This example demonstrates how to intercept a standard Aidbox FHIR endpoint with a custom application, apply extra logic, and then continue the normal persistence flow through Aidbox.

Aidbox provides the ["App" functionality](https://docs.aidbox.app/app-development/aidbox-sdk/apps), which allows you to create an App entity and define operations for FHIR requests. In this example, Aidbox delegates `POST /fhir/Encounter` to a Node.js service. The service updates the incoming Encounter resource, sends the modified resource back to Aidbox, and returns Aidbox's response to the original caller.

## How it works?

You define an App entity in Aidbox that points to your custom HTTP server. Then, you register an Operation entity that tells Aidbox to delegate matching FHIR requests to your App.

We use the [init-bundle logic](https://docs.aidbox.app/configuration/init-bundle), which loads the App and Operation resources into Aidbox as a FHIR transactional bundle on startup (`./init-bundle.json`).
Aidbox expects the Node.js service to be available at `http://host.docker.internal:4000`, as defined in the App resource.

```JSON
{
  "type": "transaction",
  "entry": [
    {
      "resource": {
        "id": "node-service-1",
        "resourceType": "App",
        "apiVersion": 1,
        "type": "app",
        "endpoint": { "url": "http://host.docker.internal:4000", "type": "http-rpc", "secret": "secret" }
      },
      "request": { "method": "PUT", "url": "/App/node-service-1" }
    }, {
      "resource": {
        "id": "encounter-fhir-api",
        "resourceType": "Operation",
        "app": { "reference": "App/node-service-1" },
        "module": "node-service-1",
        "action": "proto.app/endpoint",
        "request": ["post", "fhir", "Encounter"]
      },
      "request": { "method": "PUT", "url": "/Operation/encounter-fhir-api" }
    }
  ]
}
```

The interception logic is implemented in `src/index.ts`:

1. Aidbox receives `POST /fhir/Encounter`.
2. Aidbox forwards the request to the Node.js service.
3. The service adds an `identifier` to the Encounter:

```JSON
{
  "system": "organization-1",
  "value": "00001"
}
```

4. The service calls Aidbox directly with `POST /Encounter` and the modified resource.
5. The service returns Aidbox's response status and response body to the original client.

This pattern is useful when you need to enrich, validate, audit, route, or call external systems before allowing the original FHIR operation to continue.

## Prerequisites

- Node.js >= 18.0
- Docker (optional)


## STEP 1: Environment and Aidbox license

Copy `.env.tpl` file into `.env` file:

```shell
cp .env.tpl .env
```

If you are hosting Aidbox on your local computer, obtain the self-hosted license as described in the [documentation](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker).

Add the license (`AIDBOX_LICENSE`) int the .env file.

## STEP 2: Run aidbox and node-app in Docker

```shell
npm install
docker compose up
```

## Step 3: Open and log in into Aidbox instance

Open in browser http://localhost:8888

And log in with username: `admin` and password: `password`

## Step 4: Request `POST /fhir/Encounter` using REST Console

Aidbox delegates the request to the Node.js service using the App feature. The service intercepts the request, adds an Encounter identifier, persists the modified Encounter through Aidbox, and returns Aidbox's response.

### You can test the endpoint using curl:

```shell
curl -H "Authorization: Basic cm9vdDpzZWNyZXQ=" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8888/fhir/Encounter \
  -d '{
    "resourceType": "Encounter",
    "status": "planned",
    "class": {
      "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      "code": "AMB",
      "display": "ambulatory"
    }
  }'
```

The persisted Encounter contains the identifier added by the interception service:

```JSON
{
  "identifier": [
    {
      "system": "organization-1",
      "value": "00001"
    }
  ]
}
```
