# Topic-based Subscriptions to Kafka
[Demo](#demo) | [Documentation](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations?utm_source=app-examples&utm_medium=readme)

This example showcases [Aidbox SubscriptionTopic](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo) producing data to Kafka.

Objectives:

1. Set up Aidbox and Kafka locally using Docker Compose.
2. Get **FHIR QuestionnaireResponse** via [Aidbox Forms](https://docs.aidbox.app/modules-1/aidbox-forms?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo).
3. Learn how [AidboxSubscriptionTopic and AidboxTopicDestination](https://docs.aidbox.app/modules-1/topic-based-subscriptions/wip-dynamic-subscriptiontopic-with-destinations?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo) work with Kafka to handle the collected data.

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-refresh-toc -->
**Table of Contents**

- [Topic-based Subscriptions to Kafka](#topic-based-subscriptions-to-kafka)
  - [Prerequisites](#prerequisites)
  - [Step 1: Run Aidbox, Kafka & Kafka UI](#step-1-run-aidbox-kafka--kafka-ui)
  - [Step 2: Set Up Subscription and Destination For QuestionnaireResponse](#step-2-set-up-subscription-and-destination-for-questionnaireresponse)
  - [Step 3: Demonstration of QuestionnaireResponse subscriptions](#step-3-demonstration-of-questionnaireresponse-subscriptions)
  - [Step 4: Set Up Subscription and Destination For Encounters](#step-4-set-up-subscription-and-destination-for-encounters)
  - [Step 5: Demonstration of Encounter subscriptions](#step-5-demonstration-of-encounter-subscriptions)
  - [Example of Kubernetes Setup](#example-of-kubernetes-setup)
  - [Demo](#demo)

<!-- markdown-toc end -->

## Prerequisites

- [Docker](https://www.docker.com/)
- Cloned repository: [Github: Aidbox/examples](https://github.com/Aidbox/examples/tree/main)
- Working directory: `aidbox-subscriptions-to-kafka`

## Step 1: Run Aidbox, Kafka & Kafka UI

```shell
docker compose up
```

- Aidbox will be available at <http://localhost:8888/>
  - Upon first login, you will be asked to obtain a license by logging into https://aidbox.app
- Kafka UI will be available at <http://localhost:8080/>
- Kafka itself will be available at `http://localhost:9092/` (no authorization required)

The Docker Compose file initializes the environment for both Kafka and Aidbox with the following configuration:

- Imports FHIR Questionnaire using [init bundle](https://docs.aidbox.app/configuration/init-bundle) feature
- Creates Kafka topics for `QuestionnaireResponse` and `Encounter` (see `init-kafka` service).

## Step 2: Set Up Subscription and Destination For QuestionnaireResponse

1. **Create AidboxSubscriptionTopic Resource**

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

2. **Create AidboxTopicDestination Resource**

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

## Step 3: Demonstration of QuestionnaireResponse subscriptions

1. **Submit Form**

   - Open the [list of forms](http://localhost:8888/ui/sdc#/)
   - Click <kbd>share</kbd>
   - Enable 'allow amend' checkbox
   - Click <kbd>attach</kbd>
   - Copy the link, and open it
   - Fill out the form
   - Submit the form

2. **Check AidboxTopicDestination Status**

   Open the Aidbox [REST Console](http://localhost:8888/ui/console#/rest) and get the AidboxTopicDestination status:

   ```
   GET /fhir/AidboxTopicDestination/kafka-destination/$status
   ```

3. **See Messages in Kafka UI**

   - Open [Kafka UI](http://localhost:8080/)
   - Go to the `Topics` section, open the `aidbox-forms` topic, and open the `messages` tab
   - Review the `QuestionnaireResponse` that was created after submitting the form

## Step 4: Set Up Subscription and Destination For Encounters

1. **Create AidboxSubscriptionTopic Resource**

   To create a subscription on the `Encounter` resource for patients who have an identifier from the patient portal:

   - Open Aidbox UI
   - Navigate to the REST Console in the sidebar
   - Execute the following request:

     ```json
     POST /fhir/AidboxSubscriptionTopic
     content-type: application/json
     accept: application/json

     {
       "resourceType": "AidboxSubscriptionTopic",
       "url": "http://example.org/FHIR/R5/SubscriptionTopic/Encounter-topic",
       "status": "active",
       "trigger": [
         {
           "resource": "Encounter",
           "fhirPathCriteria": "subject.resolve().identifier.where(system.contains('patient-portal')).exists() and %current.status = 'finished' and %previous.status = 'in-progress'"
         }
       ]
     }
     ```

2. **Create AidboxTopicDestination Resource**

   In REST Console, create the `AidboxTopicDestination` for the Encounters:

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
     "id": "kafka-destination-encounters",
     "topic": "http://example.org/FHIR/R5/SubscriptionTopic/Encounter-topic",
     "parameter": [
       {
         "name": "kafkaTopic",
         "valueString": "aidbox-encounters"
       },
       {
         "name": "bootstrapServers",
         "valueString": "kafka:29092"
       }
     ]
   }
   ```

## Step 5: Demonstration of Encounter subscriptions

1. **Create Patients and Encounters**

   In Aidbox UI sidebar open the REST Console.
   Create two Patients:

   - A user of the Patient Portal (has the identifier in patient portal system):

     ```json
     POST /fhir/Patient
     content-type: application/json
     accept: application/json

     {
       "resourceType": "Patient",
       "id": "patient-portal-example",
       "identifier": [
         {
           "use": "secondary",
           "type": {
             "coding": [
               {
                 "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                 "code": "PI",
                 "display": "Patient Internal Identifier"
               }
             ]
           },
           "system": "http://hospital.example.org/patient-portal",
           "value": "portal_user_98765",
           "assigner": {
             "display": "Example Hospital Patient Portal"
           }
         }
       ]
     }
     ```

   - Not a portal user (doesn't have a portal identifier):

     ```json
     POST /fhir/Patient
     content-type: application/json
     accept: application/json

     {
       "resourceType": "Patient",
       "id": "patient-not-portal-example"
     }
     ```

2. **Create the Encounter for the first Patient**

   ```json
   POST /fhir/Encounter
   content-type: application/json
   accept: application/json

   {
     "resourceType": "Encounter",
     "id": "encounter-001",
     "status": "in-progress",
     "class": {
       "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
       "code": "AMB",
       "display": "ambulatory"
     },
     "subject": {
       "reference": "Patient/patient-portal-example"
     },
     "period": {
       "start": "2025-06-24T10:00:00Z",
       "end": "2025-06-24T10:30:00Z"
     }
   }
   ```

3. **Create the Encounter for the patient who is not a portal user**

   ```json
   POST /fhir/Encounter
   content-type: application/json
   accept: application/json

   {
     "resourceType": "Encounter",
     "id": "encounter-002",
     "status": "in-progress",
     "class": {
       "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
       "code": "EMER",
       "display": "emergency"
     },
     "subject": {
       "reference": "Patient/patient-not-portal-example"
     },
     "period": {
       "start": "2025-06-24T15:45:00Z"
     }
   }
   ```

6. **Check Messages in Kafka UI**

   - Open [Kafka UI](http://localhost:8080/)
   - Go to `Topics`, select `aidbox-encounters` and open the Messages tab.

   At this point, there should be no messages because, although we've submitted an Encounter for the patient, it didn't match the `fhirPathCriteria` we've specified.

7. **Update the Encounter**

   Use `PUT` to update the Encounter changing the `status` field from `in-progress` to `finished`:

   ```json
   PUT /fhir/Encounter/encounter-001
   content-type: application/json
   accept: application/json

   {
     "resourceType": "Encounter",
     "id": "encounter-001",
     "status": "finished",
     "class": {
       "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
       "code": "AMB",
       "display": "ambulatory"
     },
     "subject": {
       "reference": "Patient/patient-portal-example"
     },
     "period": {
       "start": "2025-06-24T10:00:00Z",
       "end": "2025-06-24T10:30:00Z"
     }
   }
   ```

8. **Check Messages in Kafka UI again**

   An Encounter message should appear.

   You'll also notice that only the Encounter for the patient `patient-portal-example` was published.
   This behavior is due to the trigger configuration in the AidboxSubscriptionTopic:

   ```json
   "trigger": [
       {
         "resource": "Encounter",
         "fhirPathCriteria": "subject.resolve().identifier.where(system.contains('patient-portal')).exists() and %current.status = 'finished' and %previous.status = 'in-progress'"
       }
     ]
   ```

   Explanation:

   - `subject.resolve().identifier.where(system.contains('patient-portal')).exists()` - matches only subjects that are part of `patient-portal`;
   - `%current.status = 'finished' and %previous.status = 'in-progress'` - messages will be sent only when the Encounter status is changed from `in-progress` to `finished`.

## Example of Kubernetes Setup

You can also find an example of k8s deployment:

- Configuration: [k8s.yaml](k8s.yaml)
- Also, you need to pass secrets for Aidbox and Database. See details: [Deploy Aidbox with Helm Charts](https://docs.aidbox.app/getting-started/run-aidbox-in-kubernetes/deploy-aidbox-with-helm-charts). We recommend using helm.
- Configuration resource examples: [k8s_resources](k8s_resources.html)

## Demo

A deployed and configured [Aidbox](https://subscriptions.hz.aidbox.dev/) instance with [Kafka](https://kafka-ui-subscriptions.hz.aidbox.dev/) is available for you to explore how Aidbox's SubscriptionTopic works. The SubscriptionTopic in Aidbox is set up to send `QuestionnaireResponse` events in the `completed` and `amended` status to Kafka.

To try it out:

1. Open <a href="https://subscriptions.hz.aidbox.dev/ui/sdc#/?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJxIjp7ImlkIjoiOTVhMmE5MzctMWY4NC00MTJiLTkyMDktNmY5ZTM4NWI0NGE4IiwidXJsIjoiaHR0cDovL2xvaW5jLm9yZy9xLzEwMDEwOS04IiwiY2Fub25pY2FsIjoiaHR0cDovL2xvaW5jLm9yZy9xLzEwMDEwOS04In0sInFyIjp7ImlkIjoiM2NiN2IzNDUtNWFjMy00ZTdlLTgwYjctZjg2MTNhNDBlZDM3In0sImFsbG93LWFtZW5kIjpudWxsLCJjb25maWciOm51bGwsImlzcyI6IlNEQ1JTQVNoYXJlZExpbmtJc3N1ZXIiLCJleHAiOjc3NzU5OTI4MDAsInJlZGlyZWN0LW9uLXN1Ym1pdCI6bnVsbCwiYXBwLW5hbWUiOm51bGwsInRoZW1lIjpudWxsLCJ1c2VyLXRva2VuIjpudWxsLCJvcGVyYXRpb25zIjpbImZoaXItcHJvY2Vzcy1yZXNwb25zZSIsInByb2Nlc3MtcmVzcG9uc2UiXSwicmVhZC1vbmx5IjpudWxsLCJyZWRpcmVjdC1vbi1zYXZlIjpudWxsfQ.rQcRFt-lr06qtJCGC12KiIRRWkoYzWHGXXbLb8g85GYvooyZVfi9NwMLFUjcHOWE751zXV1edtTBh12RM9xJkCeucocLmTvGpjQjKthMBcYjJKB6F6RGhPtDALuhdJ_oakAcsle8LSwWpwkvTyxUGrO_n9Dqn3_56GWCTRF6oVwwNzqUHZATrNvghH5T8t-60mYviSYxB72A0GnGJIxdyu8p1ND7XJvIjQWBxHNicPZw4VlkL7dIO6-IKdLIbNhAAgVdKLebQFyHFdZBwEjoov2h3qIKa77rDVoKK2e0OuBM2Y14DoR3jZcbWy1lR3bX2vozKKi8US1rXWGnY6KoWw" target="_blank">Aidbox Forms</a>
2. Share form, copy the link.
3. Open the link and fill form.
4. Open the <a href="https://kafka-ui-subscriptions.hz.aidbox.dev/ui/clusters/local/all-topics" target="_blank">Kafka UI</a> to view your `QuestionnaireResponse` in the Kafka messages tab.
