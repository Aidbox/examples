# Aidbox Subscriptions & Kafka TopicDestination

This is a demo of [Aidbox SubscriptionTopic](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations) integrated with Kafka.

In this example, we demonstrate how you can create a standard FHIR questionnaire, collect data from users via a web form, and receive all responses to the Kafka topic.

Objectives:

1. Learn how to set up Aidbox and Kafka locally via Docker Compose.
2. Learn how to collect user answers for a **FHIR Questionnaire** via [Aidbox Forms](https://docs.aidbox.app/modules-1/aidbox-forms).
3. Learn how [SubscriptionTopic and TopicDestination](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations) work with Kafka.

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-refresh-toc -->
**Table of Contents**

- [Aidbox Subscriptions & Kafka TopicDestination](#aidbox-subscriptions--kafka-topicdestination)
    - [Prerequisites](#prerequisites)
    - [Step 1: Set Up the Environment](#step-1-set-up-the-environment)
        - [Set Up Aidbox](#set-up-aidbox)
        - [Run Aidbox, Kafka & Kafka UI](#run-aidbox-kafka--kafka-ui)
    - [Step 2: Set Up Subscription and Destination](#step-2-set-up-subscription-and-destination)
        - [Create AidboxSubscriptionTopic Resource](#create-aidboxsubscriptiontopic-resource)
        - [Create TopicDestination Resource](#create-topicdestination-resource)
    - [Step 3: Feature Demonstration](#step-3-feature-demonstration)
        - [Submit Form](#submit-form)
        - [Check TopicDestination Status](#check-topicdestination-status)
        - [See Messages in Kafka UI](#see-messages-in-kafka-ui)

<!-- markdown-toc end -->

## Prerequisites

- [Docker](https://www.docker.com/)

## Step 1: Set Up the Environment

### Set Up Aidbox

1. Copy the `.env.tpl` file to `.env`:

    ```shell
    cp .env.tpl .env
    ```

2. Obtain the self-hosted license from the [Aidbox Portal](https://aidbox.app/).

3. Add the license key (`AIDBOX_LICENSE`) to the `.env` file.

### Run Aidbox, Kafka & Kafka UI

```shell
docker compose up
```

- Aidbox will be available at <http://localhost:8888/>
  - Username: `admin`
  - Password: `password`
- Kafka UI will be available at <http://localhost:8080/>
- Kafka will be available at `http://localhost:9092/` without authorization.

Additionally, the Docker Compose file initializes the setup for Kafka and Aidbox:

- Imports FHIR Questionnaire description (see `init-aidbox` service).
- Creates a Kafka topic for `QuestionnaireResponse` (see `init-kafka` service).

## Step 2: Set Up Subscription and Destination

### Create AidboxSubscriptionTopic Resource

To create a subscription on the `QuestionnaireResponse` resource, open API's -> REST Console and execute the following request:

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
      "resource": "QuestionnaireResponse",
      "fhirPathCriteria": "status = 'completed'"
    }
  ]
}
```

This resource describes the data source for the subscription but doesn't actually execute any activities from Aidbox.

### Create TopicDestination Resource

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

Creating this resource establishes a connection to the Kafka server. When the system produces an event, it will be processed to the Kafka topic.

## Step 3: Feature Demonstration

### Submit Form

Open the [list of forms](http://localhost:8888/ui/sdc#/), click `share` -> click `attach` -> copy the link -> open the link -> fill out the form, and submit it.

### Check TopicDestination Status

Open the Aidbox [REST Console](http://localhost:8888/ui/console#/rest) and get the TopicDestination status:

```
GET /fhir/TopicDestination/kafka-destination/$status
```

### See Messages in Kafka UI

Open [Kafka UI](http://localhost:8080/) -> `Topics` -> `aidbox-forms` -> `messages` and review the `QuestionnaireResponse` that was created after submitting the form.
