---
features: [api override, custom operations, fastify, app framework, fhir extensions]
languages: [TypeScript]
---
# Aidbox: Override default FHIR endpoint

This example demonstrates how to use the Aidbox FHIR server to replace the default behavior of FHIR endpoints with your own custom logic. Aidbox provides the ["App" functionality](https://docs.aidbox.app/app-development/aidbox-sdk/apps), which allows you to create an App entity and define new operations or override existing ones for any FHIR resource. With this approach, you can implement and manage custom logic for standard FHIR operations directly within your service.

## How it works?
You define an App entity in Aidbox that points to your custom HTTP server. Then, you register Operation entities to tell Aidbox which FHIR operations to delegate to your App. Aidbox forwards matching requests to your service, letting you handle them with your own logic.

We use the [init-bundle logic]](https://docs.aidbox.app/configuration/init-bundle), which loads our App and Operation resources into Aidbox as a FHIR transactional bundle on startup (`./init-bundle.json`).
Aidbox expects our server to be available at `http://host.docker.internal:4000`, as defined in the App resource.

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
        "id": "questionnaire-fhir-api",
        "resourceType": "Operation",
        "app": { "reference": "App/node-service-1" },
        "module": "node-service-1",
        "action": "proto.app/endpoint",
        "request": ["put", "fhir", "Questionnaire", { "name": "id" }]
      },
      "request": { "method": "PUT", "url": "/Operation/questionnaire-fhir-api" }
    }
  ]
}
```

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

## Step 4: Request `PUT /fhir/Questionnaire/q-1` using REST Console
Aidbox instance redirects the request to `PUT /fhir/Questionnaire/q-1` to the NodeJS service using App feature. The service response with custom response body instead of default FHIR Questionnaire operaion.

### You can test the endpoint using curl:

```shell
curl -H "Authorization: Basic cm9vdDpzZWNyZXQ=" -X PUT http://localhost:8888/fhir/Questionnaire/q-1 -d '{ data: 1 }'
```

Response:
```
{ "from":"node-service-1","message":"Hello from the Aidbox App" }
```

