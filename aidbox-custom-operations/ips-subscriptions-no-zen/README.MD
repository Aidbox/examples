---
features: [ips, subscriptions, event driven, international patient summary, no zen]
languages: [typescript]
---
# Implementation of IPS FHIR IG on Aidbox FHIR platform

This repository contains pre-configured Aidbox instance and implementation of `$summary` operation defined by IPS:

- [FHIRSchema](https://docs.aidbox.app/modules-1/profiling-and-validation/fhir-schema-validator)
- FHIR 4.3.0, ca.infoway.io.psca
- [Aidbox Topic-based subscriptions](https://docs.aidbox.app/modules/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations)
- [$summary](https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html) operation


## Prerequisites

- [Docker](https://www.docker.com/)

## STEP 1: Environment and Aidbox license

Copy `.env.tpl` file into `.env` file:

```shell
cp .env.tpl .env
```

Obtain the self-hosted license as described in the [documentation](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker).

Add the license (`AIDBOX_LICENSE`) int the .env file.

## STEP 2: Run aidbox and node-app in Docker

```shell
docker compose up --build
```

On start, the node-app will create [App resource](https://docs.aidbox.app/app-development/aidbox-sdk/aidbox-apps), [upload](./src/index.ts#L142) a sample FHIR [Bundle](./src/patientData.ts) with patient data.

## Step 3: Open and log in into Aidbox instance

Open in browser http://localhost:8888

And log in witn username: `admin` and password: `password`

## Step 4: Request $summary using REST Console

In the Aidbox admin window, navigate to the APIs section and choose REST Console.

The [$summary](https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html) operation requires either the logical ID (`Patient.id`) or a business identifier (`Patient.identifier`) of the patient.
To request the IPS "document" _Bundle_ for a specific patient using the REST Console, you can use the following request:

```
GET /fhir/Patient/[id]/$summary
```

e.g.
```
GET /fhir/Patient/2b90dd2b-2dab-4c75-9bb9-a355e07401e8/$summary
```

Or you can use request with `identifier` search parameter:

```
GET /fhir/Patient/$summary?identifier=<patient-identifier>
```

## Step 5: Check if Aidbox Topic-Based Subscriptions works

The SubscriptionTopic in Aidbox is set up to send QuestionnaireResponse events in the completed and amended status to https://aidbox.requestcatcher.com/. We will use Aidbox Forms to send QuestionnaireResponse.

To try it out:
1. Open https://aidbox.requestcatcher.com/ to view webhook requests.
2. Open Aidbox Forms at http://localhost:8888/ui/sdc#/.
3. Click "Share" on the form, then "Attach", copy the link.
4. Open the link and fill the form.

Read more about Aidbox Topic-Based Subscriptions: https://docs.aidbox.app/modules/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations
