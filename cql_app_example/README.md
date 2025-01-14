# Aidbox CQL Integration Spring Boot Example
This Spring Boot sample app uses [CQL Java engine](https://github.com/cqframework/clinical_quality_language).
The integration:
1. Client sends request to the custom Aidbox endpoint created by [App resource](https://docs.aidbox.app/app-development/aidbox-sdk/aidbox-apps).
2. Aidbox redirects it to the Spring Boot application.
3. CQL Java engine evaluates the chosen file.

## Aidbox Integration Setup
0. Start Aidbox and log in using Aidbox Portal.
```
docker compose up
```
1. Create new endpoint `http://<aidbox-url>/$evaluate-cql-library/<filename>/<evaluationName>`, which will redirect to 
`localhost:8080`.
```
PUT /App/com.cql.app.example
content-type: application/json
accept: application/json

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
    "evaluate-cql-library": {
      "path": [
        "$evaluate-cql",
        {
          "name": "library"
        },
        {
          "name": "expressionName"
        }
      ],
      "method": "GET"
    }
  },
  "resourceType": "App"
}
```

2. Add patient sample data.
```
POST /fhir/Patient
content-type: application/json
accept: application/json

{
    "resourceType": "Patient",
    "gender": "male",
    "name": [{"family": "fam"}]
}
```

3. To get all names of patients with 'male' gender, use `resources/example.cql` file:
```
library example

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

define "MalePatients":
  [Patient] P
    where P.gender.value = 'male'
    return P.name.family
```

4. Send request like this:
```
http://localhost:8888/$evaluate-cql/example/MalePatients
```
