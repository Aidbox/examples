# Topic-based Subscriptions to Kafka
[DEMO](https://github.com/Aidbox/app-examples/blob/main/aidbox-subscriptions-to-kafka/README.md#demo) | [Documentation](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations?utm_source=app-examples&utm_medium=readme)

This example showcases [Aidbox SubscriptionTopic](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo) producing data to  Kafka.

Objectives:

1. Set up Aidbox and Kafka locally using Docker Compose.
2. Get **FHIR QuestionnaireResponse** via [Aidbox Forms](https://docs.aidbox.app/modules-1/aidbox-forms?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo).
3. Learn how [AidboxSubscriptionTopic and AidboxTopicDestination](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo) work with Kafka to handle the collected data.

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-refresh-toc -->
**Table of Contents**

- [Topic-based Subscriptions to Kafka](#topic-based-subscriptions-to-kafka)
    - [Prerequisites](#prerequisites)
    - [Step 1: Set Up the Environment](#step-1-set-up-the-environment)
        - [Set Up Aidbox](#set-up-aidbox)
        - [Run Aidbox, Kafka & Kafka UI](#run-aidbox-kafka--kafka-ui)
    - [Step 2: Set Up Subscription and Destination](#step-2-set-up-subscription-and-destination)
        - [Create AidboxSubscriptionTopic Resource](#create-aidboxsubscriptiontopic-resource)
        - [Create AidboxTopicDestination Resource](#create-aidboxtopicdestination-resource)
    - [Step 3: Demonstration](#step-3-demonstration)
        - [Submit Form](#submit-form)
        - [Check AidboxTopicDestination Status](#check-aidboxtopicdestination-status)
        - [See Messages in Kafka UI](#see-messages-in-kafka-ui)
    - [Example of Kubernetes Setup](#example-of-kubernetes-setup)
    - [Demo](#demo)

<!-- markdown-toc end -->

## Prerequisites

- [Docker](https://www.docker.com/)
- Cloned repository: [Github: Aidbox/examples](https://github.com/Aidbox/examples/tree/main)
- Working directory: `aidbox-subscriptions-to-kafka`

## Step 1: Set Up the Environment

### Set Up Aidbox

1. Copy the `.env.tpl` file to `.env`:

    ```shell
    cp .env.tpl .env
    ```

2. Get a self-hosted Aidbox license from the [Aidbox Portal](https://aidbox.app/?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo).

3. Add the license key (`AIDBOX_LICENSE`) to the `.env` file.

### Run Aidbox, Kafka & Kafka UI

```shell
docker compose up
```

- Aidbox is be available at <http://localhost:8888/>
  - Username: `admin`
  - Password: `password`
- Kafka UI is be available at <http://localhost:8080/>
- Kafka is available at `http://localhost:9092/` (no authorization required)

The Docker Compose file initializes the environment for both Kafka and Aidbox with the following configuration:

- Imports FHIR Questionnaire (see `init-aidbox` service).
- Creates a Kafka topic for `QuestionnaireResponse` (see `init-kafka` service).

## Step 2: Set Up Subscription and Destination

### Create AidboxSubscriptionTopic Resource

To create a subscription on the `QuestionnaireResponse` resource that has a specific status, open Aidbox UI -> APIs -> REST Console and execute the following request:

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
      "fhirPathCriteria": "status = 'completed' or status = 'amended'"
    }
  ]
}
```

This resource describes the data source for the subscription but doesn't execute any activities from Aidbox.

### Create AidboxTopicDestination Resource

Creating this resource establishes a connection to the Kafka server. When the system produces an event, it will be processed to the specified Kafka topic.

```json
POST /fhir/AidboxTopicDestination
content-type: application/json
accept: application/json

{
  "meta": {
    "profile": [
      "http://aidbox.app/StructureDefinition/aidboxtopicdestination-kafka-at-least-once"
    ]
  },
  "kind": "kafka-at-least-once",
  "id": "kafka-destination",
  "topic": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic",
  "parameter": [
    {
      "name": "kafkaTopic",
      "valueString": "aidbox-forms"
    },
    {
      "name": "bootstrapServers",
      "valueString": "kafka:29092"
    }
  ]
}
```

## Step 3: Demonstration

### Submit Form

Open the [list of forms](http://localhost:8888/ui/sdc#/), click `share` -> enable 'allow amend' -> click `attach` -> copy the link -> open the link -> fill out the form, and submit it.

### Check AidboxTopicDestination Status

Open the Aidbox [REST Console](http://localhost:8888/ui/console#/rest) and get the AidboxTopicDestination status:

```
GET /fhir/AidboxTopicDestination/kafka-destination/$status
```

### See Messages in Kafka UI

Open [Kafka UI](http://localhost:8080/) -> `Topics` -> `aidbox-forms` -> `messages` and review the `QuestionnaireResponse` that was created after submitting the form.

## Example of Kubernetes Setup

Also you can find example of k8s deployment:

- Configuration: [k8s.yaml](https://github.com/Aidbox/examples/blob/main/aidbox-subscriptions-to-kafka/k8s.yaml)
- Also, you need to pass secrets for Aidbox and Database. See details: [Deploy Aidbox with Helm Charts](https://docs.aidbox.app/getting-started/run-aidbox-in-kubernetes/deploy-aidbox-with-helm-charts). We recommend to use helm.
- Configuration resource examples: [k8s_resources](https://github.com/Aidbox/examples/blob/main/aidbox-subscriptions-to-kafka/k8s.yaml) 

## Demo

A deployed and configured [Aidbox](https://subscriptions.hz.aidbox.dev/) instance with [Kafka](https://kafka-ui-subscriptions.hz.aidbox.dev/) is available for you to explore how Aidbox's SubscriptionTopic works. The SubscriptionTopic in Aidbox is set up to send `QuestionnaireResponse` events in the `completed` and `amended` status to Kafka.

To try it out:

1. Open <a href="https://subscriptions.hz.aidbox.dev/ui/sdc#/?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJxIjp7ImlkIjoiOTVhMmE5MzctMWY4NC00MTJiLTkyMDktNmY5ZTM4NWI0NGE4IiwidXJsIjoiaHR0cDovL2xvaW5jLm9yZy9xLzEwMDEwOS04IiwiY2Fub25pY2FsIjoiaHR0cDovL2xvaW5jLm9yZy9xLzEwMDEwOS04In0sInFyIjp7ImlkIjoiM2NiN2IzNDUtNWFjMy00ZTdlLTgwYjctZjg2MTNhNDBlZDM3In0sImFsbG93LWFtZW5kIjpudWxsLCJjb25maWciOm51bGwsImlzcyI6IlNEQ1JTQVNoYXJlZExpbmtJc3N1ZXIiLCJleHAiOjc3NzU5OTI4MDAsInJlZGlyZWN0LW9uLXN1Ym1pdCI6bnVsbCwiYXBwLW5hbWUiOm51bGwsInRoZW1lIjpudWxsLCJ1c2VyLXRva2VuIjpudWxsLCJvcGVyYXRpb25zIjpbImZoaXItcHJvY2Vzcy1yZXNwb25zZSIsInByb2Nlc3MtcmVzcG9uc2UiXSwicmVhZC1vbmx5IjpudWxsLCJyZWRpcmVjdC1vbi1zYXZlIjpudWxsfQ.rQcRFt-lr06qtJCGC12KiIRRWkoYzWHGXXbLb8g85GYvooyZVfi9NwMLFUjcHOWE751zXV1edtTBh12RM9xJkCeucocLmTvGpjQjKthMBcYjJKB6F6RGhPtDALuhdJ_oakAcsle8LSwWpwkvTyxUGrO_n9Dqn3_56GWCTRF6oVwwNzqUHZATrNvghH5T8t-60mYviSYxB72A0GnGJIxdyu8p1ND7XJvIjQWBxHNicPZw4VlkL7dIO6-IKdLIbNhAAgVdKLebQFyHFdZBwEjoov2h3qIKa77rDVoKK2e0OuBM2Y14DoR3jZcbWy1lR3bX2vozKKi8US1rXWGnY6KoWw" target="_blank">Aidbox Forms</a> 
2. Share form, copy the link.
3. Open the link and fill form.
4. Open the <a href="https://bit.ly/subscriptions-demo-kafka-ui" target="_blank">Kafka UI</a> to view your `QuestionnaireResponse` in the Kafka messages tab.
