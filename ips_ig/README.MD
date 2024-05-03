# Implementation of IPS FHIR IG on Aidbox FHIR platform

[DEMO (WIP)](https://aidbox.app) | [Inferno International Patient Summary Test Kit](https://inferno-qa.healthit.gov/suites/ips/Zb7EriZknW) 

This repository contains pre-configured Aidbox instance and implementation of `$summary` operation defined by IPS.

## About IPS (International Patient Summary)

The IPS is intended to support the provision of essential healthcare information for a patient, regardless of where they are receiving care. It includes critical information such as allergies, medications, past surgeries, and other significant medical history details. [IPS Specification](https://build.fhir.org/ig/HL7/fhir-ips/index.html)

## Prerequisites

- [Docker](https://www.docker.com/)

## STEP 1: Environment and Aidbox license

Copy `.env.tpl` file into `.env` file and add `AIDBOX_LICENSE` key

```shell
cp .env.tpl .env
```

If you are hosting Aidbox on your local computer, obtain the self-hosted trial license as described in the documentation - https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker.

## STEP 2: Run aidbox and node-app in Docker

```shell
docker compose up --build
```

## Step 3: Open and log in into Aidbox instance

Opein in browser http://localhost:8888 

And loging witn login: `admin` and password: `password`


## Step 4: Load test dataset

In the Aidbox admin window, navigate to the APIs section and choose REST Console. 
Copy and paste the following snippet into the text box of the REST Console, then click Send.
This $load request loads the Synthea test data into the server.

```
POST /fhir/$load

source: https://storage.googleapis.com/aidbox-public/synthea/100/all.ndjson.gz
```

Ensure that the data is loaded successfully by receiving a `Status: 200` response.

``` yaml
format: fhir
resources:
  CarePlan: 356
  Observation: 20382
  MedicationAdministration: 150
  Goal: 301
  Patient: 124
  DiagnosticReport: 1430
  Practitioner: 181
  ExplanationOfBenefit: 3460
  Immunization: 1636
  Claim: 4488
  MedicationRequest: 1028
  Encounter: 3460
  Condition: 871
  Procedure: 2854
  Organization: 181
  AllergyIntolerance: 40
  ImagingStudy: 134
```

[$load](https://docs.aidbox.app/api-1/bulk-api-1/usdload) endpoint documentation.


## Step 5: Request $summary using REST Console

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
GET /fhir/Patient/08b9a2bf-7492-4d15-b97f-00b54a3b35ee/$summary
```

## Step 6: Request $summary using HTTP Client

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

