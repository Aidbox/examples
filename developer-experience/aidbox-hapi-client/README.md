# Using HAPI Java client with Aidbox FHIR Server

This example demonstrates how to use the HAPI FHIR Java client library to create a patient resource in Aidbox.

## Prerequisites

- Java
- Maven
- Docker and Docker Compose

## Setup and Run

### 1. Run and activate Aidbox by following the [Getting Started Guide](https://docs.aidbox.app/getting-started/run-aidbox-locally)

### 2. Create a Client and an Access Policy

Navigate to [REST Console](http://localhost:8080/ui/console#/rest) in Aidbox UI and execute the following requests:

```json
POST /fhir/Client
content-type: application/json
accept: application/json

{
  "secret": "secret",
  "grant_types": [
    "basic"
  ],
  "id": "basic",
  "resourceType": "Client"
}
```

```json
POST /fhir/AccessPolicy
content-type: application/json
accept: application/json

{
  "link": [
    {
      "reference": "Client/basic"
    }
  ],
  "engine": "allow",
  "id": "basic-policy",
  "resourceType": "AccessPolicy"
}
```

### 3. Build and Run the Java Application

```bash
mvn clean compile exec:java
```

## What the Application Does

1. Connects to Aidbox running on `http://localhost:8080`
2. Uses basic authentication with the basic client credentials
3. Creates a sample patient with:
   - Name: John Doe
   - Birth date: January 15, 1990
   - Gender: Male
4. Retrieves the created patient to verify the operation

