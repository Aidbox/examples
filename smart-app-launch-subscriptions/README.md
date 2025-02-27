# smart-app-launch-subscriptions

The Smart App has a frontend and a backend.

## Running local example

To run the smart-app example locally, follow these steps:

**1. Start the backend**

Run the backend on your local machine. See the README file in the backend project for detailed instructions.

**2. Build the frontend**

Build the frontend locally. See the README file in the frontend project for the required steps.

**3. Open the example page**

After the frontend is built, open `launch.html` in your browser.

**4. Enjoy!**


# How to mock trigger in Aidbox


**1. Create SubscriptionTopic**
```json
POST /fhir/AidboxSubscriptionTopic
content-type: application/json
accept: application/json

{
  "resourceType": "AidboxSubscriptionTopic",
  "url": "http://example.org/FHIR/R5/SubscriptionTopic/Encounter-in-progress",
  "status": "active",
  "trigger": [
    {
      "resource": "Encounter",
      "fhirPathCriteria": "Encounter.status = 'in-progress'",
      "notificationShape": [
        {
          "resource": "Encounter",
          "include": [
            "Encounter.patient",
            "Encounter.participant.individual"
          ]
        }
      ]
    }
  ]
}
```

**2. Create TopicDestination**

```json
POST /fhir/AidboxTopicDestination
content-type: application/json
accept: application/json

{
  "resourceType": "AidboxTopicDestination",
  "meta": {
    "profile": [
      "http://aidbox.app/StructureDefinition/aidboxtopicdestination-webhook-at-least-once"
    ]
  },
  "kind": "webhook-at-least-once",
  "id": "webhook-destination",
  "topic": "http://example.org/FHIR/R5/SubscriptionTopic/Encounter-in-progress",
  "parameter": [
    {
      "name": "endpoint",
      "valueUrl": "http://subscriptions:9000/subscriptions/webhook-to-post-all-new-subscriptions-aidbox"
    },
    {
      "name": "timeout",
      "valueUnsignedInt": 30
    },
    {
      "name": "maxMessagesInBatch",
      "valueUnsignedInt": 20
    },
    {
      "name": "header",
      "valueString": "User-Agent: Aidbox Server"
    }
  ],
  "content": "full-resource"
}
```
**3. Create Subscription**
```json
POST /fhir/AidboxSubscription
content-type: application/json
accept: application/json

{
  "resourceType": "AidboxSubscription",
  "status": "active",
  "channelType": "rest-hook",
  "endpoint": "http://subscriptions:9000/subscriptions/webhook-to-post-all-new-subscriptions-aidbox",

  "topic": "http://example.org/FHIR/R5/SubscriptionTopic/Encounter-in-progress",
  "content": "full-resource"
}
```

**4. Create encounter**
```json
PUT /Encounter

{
    "resourceType": "Encounter",
    "id": "enc-234",
    "subject": {
        "resourceType": "Patient",
        "id": "01a12c22-f97a-2804-90f6-d77b5c68387c"
    },
    "class": {
        "code": "IMP",
        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        "display": "inpatient encounter"
    },
    "status": "in-progress"
}
```

