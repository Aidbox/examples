# Aidbox CQL Integration with Spring Boot Example

This Spring Boot sample application uses the [CQL Java engine](https://github.com/cqframework/clinical_quality_language) and implements the [$evaluate](https://build.fhir.org/ig/HL7/cql-ig/OperationDefinition-cql-library-evaluate.html) operation.

[CQL Specification](https://build.fhir.org/ig/HL7/cql/)

## Integration Flow:
1. The client sends a request to the custom Aidbox endpoint created using the [App resource](https://docs.aidbox.app/app-development/aidbox-sdk/aidbox-apps).
2. Aidbox redirects the request to the Spring Boot application.
3. The CQL Java engine evaluates the specified file.

## Aidbox Integration Setup

### 0. Start Aidbox and log in using the Aidbox Portal:
```
docker compose up
```

### 1. Start the Spring Boot application from your IDE or using the Maven CLI:
```
mvn spring-boot:run 
```

### 2. Create a new endpoint at `http://<aidbox-url>/Library/<cql-file-name>/$evaluate`, which will redirect to `localhost:8080`.

Paste the following HTTP request into the **Aidbox Rest Console**:
```
PUT /App/com.cql.app.example
Content-Type: application/json
Accept: application/json

{
 "id": "com.cql.app.example",
 "type": "app",
 "endpoint": {
  "url": "http://host.docker.internal:8080",
  "type": "http-rpc",
  "secret": "mysecret"
 },
 "apiVersion": 1,
 "operations": {
  "cql-library-evaluate": {
   "path": [
    "Library",
    {
     "name": "libraryName"
    },
    "$evaluate"
   ],
   "method": "POST"
  }
 },
 "resourceType": "App"
}
```

### 3. Add sample patient data:
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

### 4. To retrieve all names of patients with 'male' gender, use the `resources/example.cql` file:
```
library example

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

define "MalePatients":
  [Patient] P
    where P.gender.value = 'male'
    return P.name[0]
```

### 5. Evaluate the `example` CQL library using the Aidbox Rest Console.

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
