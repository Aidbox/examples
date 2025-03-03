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
```
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
      "fhirPathCriteria": "Encounter.status = 'in-progress'"
    }
  ]
}
```

**2. Create TopicDestination**

```
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

**3. Create Practitioner**
```
PUT /Practitioner

{
  "resourceType": "Practitioner",
  "id": "example-practitioner",
  "name": [
    {
      "use": "official",
      "family": "Smith",
      "given": ["John"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+1-555-555-5555",
      "use": "work"
    }
  ],
  "address": [
    {
      "use": "work",
      "line": ["123 Main Street"],
      "city": "Metropolis",
      "state": "NY",
      "postalCode": "12345",
      "country": "USA"
    }
  ],
  "gender": "male",
  "birthDate": "1980-01-01"
}
```

**5. Link Practitioner to Patient**

```
PATCH /fhir/Patient/01a12c22-f97a-2804-90f6-d77b5c68387c

{
  "resourceType": "Patient",
  "id": "01a12c22-f97a-2804-90f6-d77b5c68387c",
  "generalPractitioner": [
    {
      "reference": "Practitioner/example-practitioner"
    }
  ]
}
```

**6. Create encounter**
```
PUT /Encounter

{
    "resourceType": "Encounter",
    "id": "enc-1",
    "subject": {
        "resourceType": "Patient",
        "id": "01a12c22-f97a-2804-90f6-d77b5c68387c"
    },
    "status": "in-progress"
}
```

**How to create Encounter with linked Practitioner**

```
PUT /Encounter

{
  "resourceType": "Encounter",
  "id": "example-encounter",
  "status": "in-progress",
  "subject": {
    "reference": "Patient/01a12c22-f97a-2804-90f6-d77b5c68387c"
  },
  "participant": [
    {
      "actor": {
        "reference": "Practitioner/example-practitioner"
      },
      "type": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "code": "PPRF",
              "display": "primary performer"
            }
          ]
        }
      ]
    }
  ]
}
```

To connect wenhook to local backend instance provide

"valueUrl": "http://host.docker.internal:9000/subscriptions/webhook-to-post-all-new-subscriptions-aidbox"
<!-- TODO move to aidbox.json -->
```
POST /Client
Content-Type: application/json

{
  "resourceType": "Client",
  "id": "ehr-outpatient",
  "secret": "verysecret",
  "grant_types": ["password"]
}
```
<!-- TODO move to aidbox.json -->
```
POST /fhir/User
Content-Type: application/json

{
  "resourceType": "User",
  "id": "doctor-user",
  "email": "house@example.com",
  "password": "securepassword",
  "data": {
    "practitioner": {
      "id": "doctor-id",
      "resourceType": "Practitioner"
    }
  }
}
```
