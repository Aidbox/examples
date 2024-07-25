# Aidbox Notify via Custom Resources

[DEMO](https://aidbox.github.io/app-examples/aidbox-notify-via-custom-resources/) | [Custom resources using FHIRSchema](https://docs.aidbox.app/storage-1/custom-resources/custom-resources-using-fhirschema)

In this example, you can see the custom resources demonstration on the minimalistic JavaScript example project which implemented the typical flow for notifications: requesting a notification, locking it for sending, and then sending it (placeholder).

Scenarios:

1. We create a notification resource for sending (status: `requested`).
1. A worker (one of many) gets a notification that should be sent.
1. The worker locks the notification for itself and marks the notification as `in-progress`.
1. When the worker's job is done, the worker marks the notification as `completed`.

For that we define the following custom resources:

- **TutorNotification**: Represents notifications with details like type, status, template, sendAfter date, and subject.
- **TutorNotificationTemplate**: Represents templates used for notification messages.
- **Search Parameters**: Custom search parameters enable efficient querying of notifications based on criteria such as type and status.

## Objectives

1. Learn how to use [custom resources](https://docs.aidbox.app/storage-1/custom-resources/custom-resources-using-fhirschema?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo) via [FHIRSchema](https://github.com/fhir-schema/fhir-schema).
    - How to use existing value set with additional constraints as element type.
    - How to use FHIRSchema extension for additional properties.
2. Understand how to implement lock behavior via [FHIR condition update](https://build.fhir.org/http.html#cond-update).

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-refresh-toc -->
**Table of Contents**

- [Aidbox Notify via Custom Resources](#aidbox-notify-via-custom-resources)
    - [Objectives](#objectives)
    - [Prerequisites](#prerequisites)
    - [Setup Aidbox](#setup-aidbox)
        - [FHIRSchema for Custom Resources](#fhirschema-for-custom-resources)
        - [Search Parameters](#search-parameters)
        - [Initial Data](#initial-data)
        - [Notification Workflow](#notification-workflow)
            - [Request Notification to Send](#request-notification-to-send)
            - [Get Notification to Send](#get-notification-to-send)
            - [Lock Notification for Sending](#lock-notification-for-sending)
            - [Send Notification (Placeholder)](#send-notification-placeholder)

<!-- markdown-toc end -->

## Prerequisites

- A running instance of Aidbox: [Run Aidbox locally](https://docs.aidbox.app/getting-started/run-aidbox-locally-with-docker/run-aidbox-locally?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo)
- Basic authentication setup: [Basic Auth](https://docs.aidbox.app/modules-1/security-and-access-control/auth/basic-auth?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo)

## Setup Aidbox

Before starting the example, you need to:

- Define custom resources
- Define search parameters
- Load initial data

You can do this manually or via a bootstrap inside the example.

To run the example, clone the repository and open the `index.html` file in your browser or open: [Aidbox Notify via Custom Resources](https://aidbox.github.io/app-examples/aidbox-notify-via-custom-resources/).

### FHIRSchema for Custom Resources

In Aidbox REST Console:

```json
POST /fhir/FHIRSchema

{
  "id": "TutorNotificationTemplate",
  "resourceType": "FHIRSchema",
  "url": "http://example.com/aidbox-sms-tutor/TutorNotificationTemplate",
  "type": "TutorNotificationTemplate",
  "name": "TutorNotificationTemplate",
  "base": "DomainResource",
  "kind": "resource",
  "derivation": "specialization",
  "required": [
    "template"
  ],
  "elements": {
    "template": {
      "type": "string",
      "scalar": true
    }
  }
}
```

```json
POST /fhir/FHIRSchema

{
  "id": "TutorNotification",
  "resourceType": "FHIRSchema",
  "url": "http://example.com/aidbox-sms-tutor/TutorNotification",
  "type": "TutorNotification",
  "name": "TutorNotification",
  "base": "DomainResource",
  "kind": "resource",
  "ALLOW_FHIR_SCHEMA_FHIR_INCOMPATIBLE_EXTENSIONS": true,
  "derivation": "specialization",
  "required": [
    "sendAfter",
    "status",
    "subject",
    "template",
    "type"
  ],
  "elements": {
    "type": {
      "type": "string",
      "scalar": true,
      "binding": {
        "valueSet": "http://hl7.org/fhir/ValueSet/contact-point-system",
        "strength": "required"
      }
    },
    "status": {
      "type": "string",
      "scalar": true,
      "constraints": {
        "cont-status": {
          "human": "Status should be 'requested', 'in-progress' or 'completed'",
          "severity": "error",
          "expression": "%context='requested' or %context='in-progress' or %context='completed'"
        }
      },
      "binding": {
        "valueSet": "http://hl7.org/fhir/ValueSet/task-status",
        "strength": "required"
      }
    },
    "template": {
      "type": "Reference",
      "scalar": true,
      "refers": [
        "TutorNotificationTemplate"
      ]
    },
    "message": {
      "type": "string",
      "scalar": true
    },
    "sendAfter": {
      "type": "dateTime",
      "scalar": true
    },
    "subject": {
      "type": "Reference",
      "scalar": true,
      "refers": [
        "Patient"
      ]
    },
    "templateParameters": {
      "scalar": true,
      "additionalProperties": {
        "type": "string"
      }
    }
  }
}
```

In this FHIRShema:

- Here we use the standard task status value set ([link](https://hl7.org/fhir/valueset-task-status.html)) for `TutorNotification.status`, but it contains too many codes, so we restrict them via the element-specific constraint.
- Also, we use [additionalProperties FHIRSchema extensions](https://fhir-schema.github.io/fhir-schema/reference/extensions.html#additionalproperties?utm_source=github&utm_medium=readme&utm_campaign=app-examples-repo) which is <u>FHIR incompatible</u> but allows us to put all template parameters in TutorNotification resource.

### Search Parameters

For our example we need to perform the following request types:

- `GET /fhir/TutorNotification?type=sms`
- `GET /fhir/TutorNotification?status=requested`
- `GET /fhir/TutorNotification?after=gt2024-06-12T12:00:00Z`
- `GET /fhir/TutorNotification?_include=TutorNotification:template:TutorNotificationTemplate`
- `GET /fhir/TutorNotification?_include=TutorNotification:subject:Patient`
- in the example, we use a combination of all of them.

For them we need to create the following search parameters:

```json
POST /fhir/SearchParameter

{
  "resourceType": "SearchParameter",
  "id": "TutorNotification-type",
  "url": "http://example.com/aidbox-sms-tutor/TutorNotification-type",
  "version": "0.0.1",
  "status": "draft",
  "name": "type",
  "code": "type",
  "base": [
    "TutorNotification"
  ],
  "type": "token",
  "description": "Search TutorNotification by type",
  "expression": "TutorNotification.type"
}
```

```json
POST /fhir/SearchParameter

{
  "resourceType": "SearchParameter",
  "id": "TutorNotification-status",
  "url": "http://example.com/aidbox-sms-tutor/TutorNotification-status",
  "version": "0.0.1",
  "status": "draft",
  "name": "status",
  "code": "status",
  "base": [
    "TutorNotification"
  ],
  "type": "token",
  "description": "Search TutorNotification by status",
  "expression": "TutorNotification.status"
}
```

```json
POST /fhir/SearchParameter

{
  "resourceType": "SearchParameter",
  "id": "TutorNotification-after",
  "url": "http://example.com/aidbox-sms-tutor/TutorNotification-after",
  "version": "0.0.1",
  "status": "draft",
  "name": "after",
  "code": "after",
  "base": [
    "TutorNotification"
  ],
  "type": "date",
  "description": "Search TutorNotification by sendAfter",
  "expression": "TutorNotification.sendAfter"
}
```

```json
POST /fhir/SearchParameter

{
  "resourceType": "SearchParameter",
  "id": "TutorNotification-subject",
  "url": "http://example.com/aidbox-sms-tutor/TutorNotification-subject",
  "version": "0.0.1",
  "status": "draft",
  "name": "subject",
  "code": "subject",
  "base": [
    "TutorNotification"
  ],
  "type": "reference",
  "description": "Search TutorNotification by subject",
  "expression": "TutorNotification.subject"
}
```

```json
POST /fhir/SearchParameter

{
  "resourceType": "SearchParameter",
  "id": "TutorNotification-template",
  "url": "http://example.com/aidbox-sms-tutor/TutorNotification-template",
  "version": "0.0.1",
  "status": "draft",
  "name": "template",
  "code": "template",
  "base": [
    "TutorNotification"
  ],
  "type": "reference",
  "description": "Search TutorNotification by template",
  "expression": "TutorNotification.template"
}
```

### Initial Data

```json
POST /fhir/TutorNotificationTemplate

{
  "id": "welcome",
  "resourceType": "TutorNotificationTemplate",
  "template": "Hello user name: {{patient.name.given}}\n"
}
```

```json
POST /fhir/Patient

{
  "id": "pt-1",
  "name": [
    {
      "given": [
        "James"
      ],
      "family": "Morgan"
    }
  ],
  "resourceType": "Patient"
}
```

### Notification Workflow

This section explains the technical details of the notification workflow, including how each step works and what is expected at each stage.

To run the example, clone the repository and open the `index.html` file in your browser or open: [Aidbox Notify via Custom Resources](https://aidbox.github.io/app-examples/aidbox-notify-via-custom-resources/).

#### Request Notification to Send

To request a notification, follow these steps:

1. Click the "Request notification" button. This triggers the `requestNotification` function in the `index.js` file.
2. The `requestNotification` function constructs a `TutorNotification` resource with the necessary details such as type, status, template reference, sendAfter date, and subject.
3. A POST request is made to the Aidbox server at the `/TutorNotification` endpoint with the generated notification data.
4. Upon a successful response, the notification ID is logged and displayed in the journal section.

#### Get Notification to Send

To retrieve a notification for sending:

1. Click the "Get notification" button. This triggers the `getNotification` function in the `index.js` file.
2. The `getNotification` function constructs a URL with the appropriate search parameters to filter notifications by type, status, and includes related resources.
3. A GET request is made to the Aidbox server at the `/TutorNotification` endpoint with the constructed URL.
4. The response is parsed, and the retrieved notification, patient, and template details are displayed in the notification section.

#### Lock Notification for Sending

Locking a notification ensures that it is marked as in-progress and cannot be processed by another entity simultaneously. This is achieved through a conditional update:

1. Click the "Lock notification" button. This triggers the `lockNotification` function in the `index.js` file.
2. The `lockNotification` function updates the status of the notification to "in-progress".
3. A PUT request is made to the Aidbox server at the `/TutorNotification/{id}` endpoint with the updated notification data.
4. The conditional update checks the `If-Match` header with the notification's version ID to ensure the update only occurs if the notification has not been modified since it was retrieved.

#### Send Notification (Placeholder)

Sending a notification involves:

1. Clicking the "Send notification" button, which triggers the `sendNotification` function in the `index.js` file.
2. The `sendNotification` function checks if a notification is in-progress before proceeding.
3. A message is generated using the template and patient details.
4. The actual sending process should be implemented in the designated section of the `index.js` file.
5. The notification status is updated to "completed" and a PUT request is made to the Aidbox server to save the changes.
6. The notification ID is logged, and the notification section is cleared.
