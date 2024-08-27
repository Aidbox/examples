# [WIP] Aidbox SubscriptionTopic with Kafka

This is a demo of [Aidbox SubscriptionTopic](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations) integrated with Kafka.

In this example we demonstrate how you can create standard FHIR questionnaire, collecting data from users via web form and receives all responses to the Kafka topic.

Objectives:

1. How to up and running Aidbox and Kafka locally via docker compose.
1. Learn how to collect user answers for **FHIR Questionnaire** via [Aidbox Forms](https://docs.aidbox.app/modules-1/aidbox-forms).
1. Learn how [SubscriptionTopic and TopicDestination](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations) works with Kafka.

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-refresh-toc -->
**Table of Contents**

- [[WIP] Aidbox SubscriptionTopic with Kafka](#wip-aidbox-subscriptiontopic-with-kafka)
    - [Prerequisites](#prerequisites)
    - [Step 1: Set Up the Environment](#step-1-set-up-the-environment)
        - [Set Up Aidbox](#set-up-aidbox)
        - [Run Aidbox, Kafka & Kafka UI](#run-aidbox-kafka--kafka-ui)
    - [STEP 2: Set up Subscription and Destination](#step-2-set-up-subscription-and-destination)
        - [Create AidboxSubscriptionTopic resource](#create-aidboxsubscriptiontopic-resource)
        - [Create TopicDestination resource](#create-topicdestination-resource)
        - [Create Kafka Topic](#create-kafka-topic)
    - [STEP 3: Feature demonstration](#step-3-feature-demonstration)
        - [Submit form](#submit-form)
        - [Check TopicDestination status](#check-topicdestination-status)
        - [See messages in Kafka UI](#see-messages-in-kafka-ui)

<!-- markdown-toc end -->


## Prerequisites

- [Docker](https://www.docker.com/)

## Step 1: Set Up the Environment

### Set Up Aidbox

Copy the `.env.tpl` file to `.env`:

```shell
cp .env.tpl .env
```

If you are hosting Aidbox on your local machine, obtain the self-hosted license from the [Aidbox Portal](https://aidbox.app/).

Add the license key (AIDBOX_LICENSE) to the .env file.

### Run Aidbox, Kafka & Kafka UI

```shell
docker compose up
```

- Aidbox will be available on <http://localhost:8888/>
  - Username: `admin`
  - Password: `password`
- Kafka UI will be available on <http://localhost:8080/>
- Kafka will be available on `http://localhost:9092/`

Additionally, the docker compose file makes initial setup for Kafka and Aidbox:

- Import FHIR Questionnaire description and create from (see `init-aidbox` service).
- Create Kafka topic for QuestionnaireResponse-s (see `init-kafka` service).

## STEP 2: Set up Subscription and Destination

### Create AidboxSubscriptionTopic resource

To create Subscription on QuestionnaireResponse resource open API's -> REST Console and execute the following request:

```json
POST /fhir/AidboxSubscriptionTopic
content-type: application/json
accept: application/json

{
  "resourceType": "AidboxSubscriptionTopic",
  "url": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic",
  "status": "active",
  "trigger": [
    {
      "resource": "QuestionnaireResponse"
    }
  ]
}
```

### Create TopicDestination resource

```json
POST /fhir/TopicDestination
content-type: application/json
accept: application/json

{
  "meta": {
    "profile": [
      "http://fhir.aidbox.app/StructureDefinition/TopicDestinationKafka"
    ]
  },
  "kind": "kafka",
  "id": "kafka-destination",
  "topic": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic",
  "parameter": [
    {
      "name": "kafkaTopic",
      "valueString": "aidbox-forms"
    },
    {
      "name": "bootstrap.servers",
      "valueString": "kafka:29092"
    }
  ]
}
```

### Create Kafka Topic

Create a Kafka Topic named aidbox-forms. If you used our Docker Compose file, the Kafka topic should be created automatically.

## STEP 3: Feature demonstration

### Submit form

Open [list of forms](http://localhost:8888/ui/sdc#/), click `share` -> click `attach` -> copy the link -> open the link -> fill the form out, and submit it.

### Check TopicDestination status

Open back Aidbox [REST Console](http://localhost:8888/ui/console#/rest) and get the TopicDestination status:

```
GET /fhir/TopicDestination/kafka-destination/$status
```

### See messages in Kafka UI

Open [Kafka UI](http://localhost:8080/) -> `Topics` -> `aidbox-forms` -> `messages` and review the QuestionnaireResponse that was created after submitting the depression form.
