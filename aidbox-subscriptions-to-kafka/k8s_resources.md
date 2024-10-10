# Resource Examples for K8s

```rest
POST /fhir/AidboxSubscriptionTopic
content-type: application/json
accept: application/json

{
  "id": "8eefc18f-ff32-4097-9ba5-e035ae3bcef6",
  "meta": {
    "lastUpdated": "2024-10-04T08:13:34.418878Z",
    "versionId": "543",
    "extension": [
      {
        "url": "ex:createdAt",
        "valueInstant": "2024-10-04T08:13:34.418878Z"
      }
    ]
  },
  "resourceType": "AidboxSubscriptionTopic",
  "status": "active",
  "trigger": [
    {
      "resource": "QuestionnaireResponse",
      "fhirPathCriteria": "status = 'completed' or status = 'amended'"
    }
  ],
  "url": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic"
}
```

```rest
POST /fhir/AidboxTopicDestination
content-type: application/json
accept: application/json

{
  "meta": {
    "profile": [
      "http://aidbox.app/StructureDefinition/aidboxtopicdestination-kafka-best-effort"
    ]
  },
  "kind": "kafka-best-effort",
  "id": "kafka-destination-be",
  "topic": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic",
  "parameter": [
    {
      "name": "kafkaTopic",
      "valueString": "aidbox-forms-best-effort"
    },
    {
      "name": "bootstrapServers",
      "valueString": "kafka:29092"
    }
  ]
}
```

```rest
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
  "id": "kafka-destination-alo",
  "topic": "http://example.org/FHIR/R5/SubscriptionTopic/QuestionnaireResponse-topic",
  "parameter": [
    {
      "name": "kafkaTopic",
      "valueString": "aidbox-forms-at-least-once"
    },
    {
      "name": "bootstrapServers",
      "valueString": "kafka:29092"
    }
  ]
}
```

Access policies

```json
{
  "id":"subscription-demo-allow-sdc",
  "link":[
    {
      "id":"sdc-config",
      "resourceType":"Operation"
    },
    {
      "id":"topic-destination-status",
      "resourceType":"Operation"
    },
    {
      "id":"populate-questionnaire-link-id",
      "resourceType":"Operation"
    }
  ],
  "meta":{
    "createdAt":"2024-10-04T11:11:41.096668Z",
    "versionId":"1185",
    "lastUpdated":"2024-10-04T11:11:41.096668Z"
  },
  "engine":"allow",
  "resourceType":"AccessPolicy"
}
```

```json
{
  "id":"subscription-demo-rpcs",
  "rpc":{
    "aidbox.sdc.patient/forms-grid":true,
    "aidbox.sdc.grid/get-definition":true,
    "aidbox.sdc.patient/documents-workflows-grid":true
  },
  "meta":{
    "createdAt":"2024-08-29T14:28:43.756160Z",
    "versionId":"143",
    "lastUpdated":"2024-08-29T14:54:40.426408Z"
  },
  "type":"rpc",
  "engine":"allow-rpc",
  "description":"public rpc methods",
  "resourceType":"AccessPolicy"
}
```
