# [WIP] Aidbox SubscriptionTopic with Kafka

This is a demo of [Aidbox SubscriptionTopic](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations) integrated with Kafka.

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
      "valueString": "localhost:9092"
    }
  ]
}
```

### Create Kafka Topic
 
Create a Kafka Topic named aidbox-forms. If you used our Docker Compose file, the Kafka topic should be created automatically.

## STEP 3: Feature demonstration

### Submit form

Open [Depression form](http://localhost:8888/ui/sdc#/questionnaire-response/depression-form), fill it out, and submit it.

### Check TopicDestination status

Open back Aidbox [REST Console](http://localhost:8888/ui/console#/rest) and get the TopicDestination status:

```
GET /fhir/TopicDestination/kafka-destination/$status
```

### See messages in Kafka UI  

Open [Kafka UI](http://localhost:8080/) -> `Topics` -> `aidbox-forms` -> `messages` and review the QuestionnaireResponse that was created after submitting the depression form.



