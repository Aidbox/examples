# Aidbox: Override default FHIR endpoint

A simple Fastify server that handles `PUT /fhir/Questionnaire` FHIR endpoint with custom logic instead of default FHIR Operation.

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
docker compose up --build
```

## Step 3: Open and log in into Aidbox instance

Open in browser http://localhost:8888

And log in witn username: `admin` and password: `password`

## Step 4: Request `PUT /fhir/Questionnaire/q-1` using REST Console
Aidbox instance redirects the request to `PUT /fhir/Questionnaire/q-1` to the NodeJS service using App feature. The service response with custom response body instead of default FHIR Questionnaire operaion.

### You can test the endpoint using curl:

```shell
curl -H "Authorization: Basic cm9vdDpzZWNyZXQ=" -X PUT http://localhost:8888/fhir/Questionnaire/q1 -d '{ data: 1 }'
```

Response:
```
{ "from":"node-service-1","message":"Hello from the Aidbox App" }
```

