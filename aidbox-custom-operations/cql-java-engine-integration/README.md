---
features: [cql, custom operations, spring boot, fhir operations, clinical decision support]
languages: [java]
---
# Aidbox CQL Integration with Spring Boot Example

This Spring Boot sample application uses the [CQL Java engine](https://github.com/cqframework/clinical_quality_language) and implements the [$evaluate](https://build.fhir.org/ig/HL7/cql-ig/OperationDefinition-cql-library-evaluate.html) operation.

[CQL Specification](https://build.fhir.org/ig/HL7/cql/)

## Integration Flow:
1. The client sends a request to the custom Aidbox `$evaluate` endpoint created using the [App resource](https://docs.aidbox.app/app-development/aidbox-sdk/aidbox-apps).
2. Aidbox redirects the request to the Spring Boot application.
3. The CQL Java engine evaluates the specified file.

## Aidbox Integration Setup

### 0. Start Aidbox and the CQL Engine App
```
docker compose up --build
```

### 1. Activate the Aidbox instance

Navigate to http://localhost:8080 in the browser and activate your Aidbox instance

### 2. Add sample patient data:

Navigate to **REST Console** in Aidbox UI and execute the following request:

```
POST /fhir/Patient
Content-Type: application/json
Accept: application/json

{
  "resourceType": "Patient",
  "gender": "male",
  "name": [
    {
      "family": "fam"
    }
  ]
}
```

### 3. To retrieve all names of patients with 'male' gender, use the `resources/example.cql` file:
```
library example

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

define "MalePatients":
  [Patient] P
    where P.gender.value = 'male'
    return P.name[0]
```

### 4. Evaluate the `example` CQL library using the Aidbox Rest Console.

Request:
```
POST /Library/example/$evaluate
```

Response:
```
{
  "resourceType": "Parameters",
  "parameters": [
    {
      "name": "MalePatients",
      "valueHumanName": {
        "family": "fam"
      }
    }
  ]
}
```
