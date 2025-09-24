---
features: [IPS, International Patient Summary, FHIR IG, Summary operation, Narrative generation]
languages: [TypeScript]
---
# Implementation of IPS FHIR IG on Aidbox FHIR platform

[Demo](https://ips.hz.aidbox.dev/fhir/Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8/$summary) | [Inferno International Patient Summary Test Kit](https://inferno-qa.healthit.gov/suites/ips/Zb7EriZknW)

This repository contains pre-configured Aidbox instance and implementation of `$summary` operation defined by IPS.

## About IPS (International Patient Summary)

The IPS is intended to support the provision of essential healthcare information for a patient, regardless of where they are receiving care. It includes critical information such as allergies, medications, past surgeries, and other significant medical history details. See [IPS Specification](https://build.fhir.org/ig/HL7/fhir-ips/index.html)

## Prerequisites

- [Docker](https://www.docker.com/)

## STEP 1: Environment and Aidbox license

Copy `.env.tpl` file into `.env` file:

```shell
cp .env.tpl .env
```

If you are hosting Aidbox on your local computer, obtain the self-hosted license as described in the [documentation](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker).

Add the license (`AIDBOX_LICENSE`) int the .env file.

## STEP 2: Run aidbox and node-app in Docker

```shell
docker compose up --build
```

On start, the node-app will [upload](./src/index.ts#L142) a sample FHIR [Bundle](./src/patientData.ts) with patient data.

## Step 3: Open and log in into Aidbox instance

Open in browser http://localhost:8888

And log in witn username: `admin` and password: `password`

## Step 4: Request $summary using REST Console

In the Aidbox admin window, navigate to the APIs section and choose REST Console.

The [$summary](https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html) operation requires either the logical ID (`Patient.id`) or a business identifier (`Patient.identifier`) of the patient.
You can use the following request to view all available patients:

```
GET /fhir/Patient?_elements=id,identifier
```

To request the IPS "document" _Bundle_ for a specific patient using the REST Console, you can use the following request:

```
GET /fhir/Patient/[id]/$summary
```

Replace [id] with the logical ID of the patient you want to retrieve the IPS document for.

For example:

```
GET /fhir/Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8/$summary
```

Or you can use request with `identifier` search parameter:

```
GET /fhir/Patient/$summary?identifier=<patient-identifier>
```

For example:

```
GET /fhir/Patient/$summary?identifier=574687583
```

## Step 5: Request $summary using HTTP Client

If you're starting the Aidbox FHIR server for the first time, the initial step involves creating a _Client_ resource with an ID and secret.
Since the newly created client does not have default permissions to access the Aidbox REST API, the next step is to configure access policies.
Refer to the documentation: [Create and test access control](https://docs.aidbox.app/modules-1/security-and-access-control/auth/basic-auth)

The easiest way to achieve this is by navigating to Auth > Sandbox in the Aidbox Web Admin UI and performing REST queries to create the 'basic' client and assign the AccessPolicy.

Once the client is created, you can perform the `$summary` operation using an HTTP tool, similar to the following example:

```
curl --location 'http://localhost:8888/fhir/Patient?_elements=id%2Cidentifier' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic YmFzaWM6c2VjcmV0' \
--data ''
```

## Deploy

This application works with [aidbox running](https://docs.aidbox.app/getting-started/run-aidbox-in-kubernetes/deploy-aidbox-in-kubernetes) under the following settings (envs):

```yaml
AIDBOX_FHIR_VERSION=4.0.1
AIDBOX_FHIR_SCHEMA_VALIDATION=true
AIDBOX_FHIR_PACKAGES=hl7.fhir.r4.core#4.0.1:hl7.fhir.uv.ips#1.1.0
AIDBOX_VALIDATE_BINDING_URL="https://r4.ontoserver.csiro.au/fhir/ValueSet/\$validate-code"
```

It is possible to deploy Aidbox with [Helm charts](https://github.com/Aidbox/helm-charts/tree/main). To do so, follow the steps outlined below:

### 1. Add aidbox helm repo

```
helm repo add aidbox https://aidbox.github.io/helm-charts
```

### 2. Prepare database config

```yaml
config: |-
  listen_addresses = '*'
  shared_buffers = '2GB'
  max_wal_size = '4GB'
  pg_stat_statements.max = 500
  pg_stat_statements.save = false
  pg_stat_statements.track = top
  pg_stat_statements.track_utility = true
  shared_preload_libraries = 'pg_stat_statements'
  track_io_timing = on
  wal_level = logical
  wal_log_hints = on
  archive_command = 'wal-g wal-push %p'
  restore_command = 'wal-g wal-fetch %f %p'

env:
  PGDATA: /data/pg
  POSTGRES_DB: postgres
  POSTGRES_PASSWORD: <your-postgres-password>

image.repository: healthsamurai/aidboxdb
image.tag: "16.1"
storage:
  size: "10Gi"
  className: <your-storage-className>
```

### and apply it

```
helm upgrade --install aidboxdb aidbox/aidboxdb \
  --namespace ips --create-namespace \
  --values /path/to/db-config.yaml
```

### 3. Prepare Aidbox config

```yaml
host: <your-aidbox-host>
protocol: https

config:
  PGHOST: aidboxdb.ips.svc.cluster.local
  PGDATABASE: postgres
  PGUSER: postgres
  PGPASSWORD: <your-postgres-password>
  AIDBOX_CLIENT_ID: <your-aidbox-client-id>
  AIDBOX_CLIENT_SECRET: <your-aidbox-client-password>
  AIDBOX_ADMIN_ID: <your-aidbox-admin-id>
  AIDBOX_ADMIN_PASSWORD: <your-aidbox-admin-password>
  AIDBOX_LICENSE: <aidbox-license>
  AIDBOX_DEV_MODE: true
  AIDBOX_FHIR_VERSION: 4.0.1
  AIDBOX_FHIR_SCHEMA_VALIDATION: true
  AIDBOX_FHIR_PACKAGES: hl7.fhir.r4.core#4.0.1:hl7.fhir.uv.ips#1.1.0
  AIDBOX_VALIDATE_BINDING_URL: "https://r4.ontoserver.csiro.au/fhir/ValueSet/$validate-code"
  AIDBOX_BASE_URL: <your-base-url>
  AIDBOX_PORT: 8888
  AIDBOX_COMPLIANCE: enabled

ingress:
  annotations:
    acme.cert-manager.io/http01-ingress-class: nginx
    cert-manager.io/cluster-issuer: letsencrypt
    kubernetes.io/ingress.class: nginx
```

### and apply it

```
helm upgrade --install aidbox aidbox/aidbox \
  --namespace ips --create-namespace \
  --values /path/to/aidbox-config.yaml
```

To deploy the application use [prepared](./k8s.yaml) k8s config. Additionally, you have to add to the config resource `Secret`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ips-app
  namespace: ips
stringData:
  AIDBOX_CLIENT_ID: <your_aidbox_client_id>
  AIDBOX_CLIENT_SECRET: <your_aidbox_client_secret>
  APP_SECRET: <your_app_secret> # allows aidbox safely communicate with this app
```

## Run Inferno IPS tests

To run Inferno IPS tests against this implementation:

1. Copy the prepared [configuration](./ips-inferno-config.json) for the test suite.
2. Create a test session on the [Inferno website](https://inferno-qa.healthit.gov/test-kits/international-patient-summary/).
3. Click on the "RUN ALL TESTS" button.
4. Paste the copied configuration into the JSON field and submit.
