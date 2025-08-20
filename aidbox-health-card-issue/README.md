# SMART Health Cards Issue Operation

A minimal TypeScript implementation of the FHIR `$health-cards-issue` operation that integrates with Aidbox to generate SMART Health Cards from patient health data.

## Overview

This project implements the [SMART Health Cards specification](https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/OperationDefinition-patient-i-health-cards-issue.html) as a FHIR operation. It retrieves patient health data from Aidbox, sanitizes it according to SMART Health Cards requirements, and generates verifiable health cards in [JWS](https://datatracker.ietf.org/doc/html/rfc7515) format.

## Architecture

```mermaid
flowchart LR
    Client[Client]
    Aidbox[Aidbox<br/>FHIR Server]
    App[Health Cards App<br/>Node.js]

    Client -->|$health-cards-issue| Aidbox
    Aidbox -->|$health-cards-issue| App
    App -->|Fetch FHIR data| Aidbox
    App -->|Signed Health Card| Aidbox
    Aidbox -->|Signed Health Card| Client


    style Aidbox fill:#e1f5fe
    style App fill:#f3e5f5
    style Client fill:#e8f5e8
```

**Components:**
- **FHIR Server**: Aidbox with [custom operation routing](https://www.health-samurai.io/docs/aidbox/developer-experience/aidbox-sdk/apps)
- **Application**: Node.js TypeScript backend service - actual implementation of `$health-cards-issue` operation
- **Output**: Cryptographically signed SMART Health Cards (JWS format)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)

### Running the Application

1. **Create .env file**
```bash
cp .envexample .env
```

2. **Generate signing keys**:
   ```bash
   npm run generate-keys
   ```


3. **Run docker compose**:
    ```bash
   docker compose up --build
   ```

4. **Initialize Aidbox instance**
Navigate to [Aidbox UI](http://localhost:8080) and initialize the Aidbox instance.

### Testing Health Cards generation

1. **Run `$health-cards-issue` operation**

Navigate to  [Aidbox Rest Console](http://localhost:8080/ui/console#/rest) and execute the following request:

```http
POST /fhir/Patient/example-patient/$health-cards-issue
Content-Type: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "credentialType",
      "valueString": "Immunization"
    },
    {
      "name": "credentialType",
      "valueString": "Observation"
    },
    {
      "name": "_since",
      "valueInstant": "2023-01-01T00:00:00Z"
    },
    {
      "name": "includeIdentityClaim",
      "valueBoolean": false
    }
  ]
}
```

Example response:
```json
{
 "resourceType": "Parameters",
 "parameter": [
  {
   "name": "verifiableCredential",
   "valueString": "eyJhbGciOiJFUzI1NiIsInppcCI6IkRFRiIsImtpZCI6IjcxMTFkNDhkMzNhYmJmZTIifQ.eyJpc3MiOiJodHRwczovL2V4YW1wbGUub3JnL2hlYWx0aC1jYXJkcyIsIm5iZiI6MTc1NTY5OTM5MywidmMiOnsidHlwZSI6WyJodHRwczovL3NtYXJ0aGVhbHRoLmNhcmRzI2hlYWx0aC1jYXJkIiwiaHR0cHM6Ly9zbWFydGhlYWx0aC5jYXJkcyNpbW11bml6YXRpb24iXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiZmhpclZlcnNpb24iOiI0LjAuMSIsImZoaXJCdW5kbGUiOnsicmVzb3VyY2VUeXBlIjoiQnVuZGxlIiwidHlwZSI6ImNvbGxlY3Rpb24iLCJlbnRyeSI6W3sicmVzb3VyY2UiOnsicmVzb3VyY2VUeXBlIjoiUGF0aWVudCIsIm5hbWUiOlt7ImZhbWlseSI6IkRvZSIsImdpdmVuIjpbIkpvaG4iXX1dLCJiaXJ0aERhdGUiOiIxOTgwLTAxLTAxIn19LHsicmVzb3VyY2UiOnsicGF0aWVudCI6eyJyZWZlcmVuY2UiOiJQYXRpZW50L2V4YW1wbGUtcGF0aWVudCJ9LCJwcm90b2NvbEFwcGxpZWQiOlt7InNlcmllcyI6IkNPVklELTE5IFByaW1hcnkgU2VyaWVzIiwiZG9zZU51bWJlclBvc2l0aXZlSW50IjoxLCJzZXJpZXNEb3Nlc1Bvc2l0aXZlSW50IjoyfV0sInNpdGUiOnsiY29kaW5nIjpbeyJjb2RlIjoiTEEiLCJzeXN0ZW0iOiJodHRwOi8vdGVybWlub2xvZ3kuaGw3Lm9yZy9Db2RlU3lzdGVtL3YzLUFjdFNpdGUifV19LCJ2YWNjaW5lQ29kZSI6eyJjb2RpbmciOlt7ImNvZGUiOiIyMDgiLCJzeXN0ZW0iOiJodHRwOi8vaGw3Lm9yZy9maGlyL3NpZC9jdngifV19LCJkb3NlUXVhbnRpdHkiOnsiY29kZSI6Im1MIiwidW5pdCI6Im1MIiwidmFsdWUiOjAuMywic3lzdGVtIjoiaHR0cDovL3VuaXRzb2ZtZWFzdXJlLm9yZyJ9LCJyb3V0ZSI6eyJjb2RpbmciOlt7ImNvZGUiOiJJTSIsInN5c3RlbSI6Imh0dHA6Ly90ZXJtaW5vbG9neS5obDcub3JnL0NvZGVTeXN0ZW0vdjMtUm91dGVPZkFkbWluaXN0cmF0aW9uIn1dfSwicmVzb3VyY2VUeXBlIjoiSW1tdW5pemF0aW9uIiwicmVjb3JkZWQiOiIyMDIzLTAzLTE1IiwicHJpbWFyeVNvdXJjZSI6dHJ1ZSwic3RhdHVzIjoiY29tcGxldGVkIiwibG90TnVtYmVyIjoiQUJDMTIzIiwib2NjdXJyZW5jZURhdGVUaW1lIjoiMjAyMy0wMy0xNSIsImV4cGlyYXRpb25EYXRlIjoiMjAyNC0xMi0zMSIsInBlcmZvcm1lciI6W3siYWN0b3IiOnsiZGlzcGxheSI6IkRyLiBKYW5lIFNtaXRoLCBNRCJ9LCJmdW5jdGlvbiI6eyJjb2RpbmciOlt7ImNvZGUiOiJBUCIsInN5c3RlbSI6Imh0dHA6Ly90ZXJtaW5vbG9neS5obDcub3JnL0NvZGVTeXN0ZW0vdjItMDQ0MyJ9XX19XX19LHsicmVzb3VyY2UiOnsiY2F0ZWdvcnkiOlt7ImNvZGluZyI6W3siY29kZSI6ImxhYm9yYXRvcnkiLCJzeXN0ZW0iOiJodHRwOi8vdGVybWlub2xvZ3kuaGw3Lm9yZy9Db2RlU3lzdGVtL29ic2VydmF0aW9uLWNhdGVnb3J5In1dfV0sInJlc291cmNlVHlwZSI6Ik9ic2VydmF0aW9uIiwiZWZmZWN0aXZlRGF0ZVRpbWUiOiIyMDIzLTAzLTEwIiwic3RhdHVzIjoiZmluYWwiLCJjb2RlIjp7ImNvZGluZyI6W3siY29kZSI6Ijk0NTAwLTYiLCJzeXN0ZW0iOiJodHRwOi8vbG9pbmMub3JnIn1dfSwidmFsdWVDb2RlYWJsZUNvbmNlcHQiOnsiY29kaW5nIjpbeyJjb2RlIjoiMjYwMzg1MDA5Iiwic3lzdGVtIjoiaHR0cDovL3Nub21lZC5pbmZvL3NjdCJ9XX0sInN1YmplY3QiOnsicmVmZXJlbmNlIjoiUGF0aWVudC9leGFtcGxlLXBhdGllbnQifSwicGVyZm9ybWVyIjpbeyJkaXNwbGF5IjoiRXhhbXBsZSBMYWIifV19fV19fX19.3WVpGCl8qD3E2apBLma1OZ36DyLsS_AwhOaZWdQ0iu4rMkt2zuLj5o4V_xWL-Tv5175H7-gWbx6bqrmM3Foi3w"
  }
 ]

```

2. **Test the JWS**
Extract the `valueString` element and decode the JWT using `https://www.jwt.io/`
The decoded payload in the HealthCard should match the data you pre-loaded into Aidbox using  [init-bundle](/init-bindle/bundle.json)
To validate the signature, retrieve the public key from [http://localhost:8080/.well-known/jwks.json](http://localhost:8080/.well-known/jwks.json)
