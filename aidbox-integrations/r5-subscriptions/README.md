---
features: [Analytics, Subscriptions, FHIR R5]
---
# FHIR R5 Topic-Based Subscriptions

This example demonstrates how to implement FHIR R5 topic-based subscriptions in Aidbox.

## Overview

The example shows how to:

- Define a custom `SubscriptionTopic` for ClaimResponse resources
- Configure an `AidboxTopicDestination` for R5-compliant subscriptions
- Create a `Subscription` that filters events by organization
- Receive webhook notifications when matching resources are created or updated

## Components

### 1. AidboxSubscriptionTopic

Defines what events trigger notifications:

- **Resource**: `ClaimResponse`
- **Trigger Criteria**: `status = 'active'`
- **Filter**: Can filter by insurer organization identifier

### 2. AidboxTopicDestination

Configures the R5 subscription behavior:

- **Kind**: `fhir-native-topic-based-subscription`
- **Content**: `full-resource` (sends complete resource in notifications)
- **Deliverers**: 2 parallel workers
- **Event Retention**: 24 hours (86400 seconds)

### 3. Subscription

The actual subscription that listens for events:

- **Topic**: Da Vinci PAS SubscriptionTopic
- **Filter**: Only ClaimResponse for `Organization/org-1`
- **Endpoint**: `http://echo-server:9090/webhook`
- **Channel**: REST hook (webhook)
- **Heartbeat**: Every 60 seconds
- **Timeout**: 30 seconds

### 4. Echo Server

A simple HTTP echo service that:

- Logs all incoming webhook requests
- Responds with request details
- Runs on port 9090

## Getting Started

```bash
docker-compose up -d
```

Open [Aidbox](http://localhost:8080), and activate your Aidbox.

### Verify Subscription Status

```bash
GET /fhir/Subscription/pas-subscription-r5
```

The subscription should have `status: "active"` once Aidbox processes it.

## Testing the Subscription

This ClaimResponse will trigger a notification because it:

- Has `status: "active"`
- References `Organization/org-1` as the insurer

```bash
POST http://localhost:8080/fhir/ClaimResponse 

{
    "resourceType": "ClaimResponse",
    "status": "active",
    "type": {
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "institutional"
      }]
    },
    "use": "preauthorization",
    "patient": {
      "reference": "Patient/example"
    },
    "created": "2024-01-15T10:00:00Z",
    "insurer": {
      "reference": "Organization/org-1"
    },
    "outcome": "complete"
  }
```

### 2. Check Echo Server Logs

View the webhook notification received by the echo server:

```bash
docker-compose logs echo-server
```

You should see a POST request to `/webhook` with the full ClaimResponse resource in the notification bundle.
