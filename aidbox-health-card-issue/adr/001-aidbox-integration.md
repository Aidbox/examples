# ADR-001: Aidbox Integration Architecture

## Status
Accepted

## Context
We need to implement the `$health-cards-issue` FHIR operation as a TypeScript application integrated with Aidbox. The integration requires two communication paths: receiving operation calls from Aidbox and making FHIR API calls back to Aidbox for data retrieval.

## Decision
We will implement a bidirectional integration between Aidbox and our Node.js application:

### 1. Aidbox → Node App Integration
End clients call the FHIR operation in Aidbox:
```
POST /fhir/Patient/{id}/$health-cards-issue
```

We configure an App resource in Aidbox to route operation calls to our Node.js application:
```json
{
  "resourceType": "App",
  "id": "health-cards-app",
  "type": "app",
  "apiVersion": 1,
  "endpoint": {
    "url": "http://host.docker.internal:3000/health-cards-issue",
    "secret": "health-cards-app-secret"
  },
  "operations": {
    "health-cards-issue": {
      "method": "POST",
      "path": ["fhir", "Patient", { "name": "id" }, "$health-cards-issue"]
    }
  }
}
```

This results in Aidbox calling our Node app with the following request structure:
```typescript
{
  type: string;
  operation: {
    id: string;
  };
  request: {
    params: Record<string, string>;
    "route-params": Record<string, any>;
    headers: Record<string, any>;
    "oauth/user": Record<string, any>;
  }
}
```

The `route-params` will contain `id = 'patient-id'` for the patient whose health cards are being issued.

Other Parameters are request.resource:

```json
{resourceType: 'Parameters', parameter: Array(3)}
```
```json
{name: 'credentialType', valueString: 'Observation'}
```
```json
{name: '_since', valueInstant: '2023-01-01T00:00:00Z'}
```
```json
{name: 'includeIdentityClaim', valueBoolean: false}
```

### 2. Node App → Aidbox Integration
Our Node.js application integrates with Aidbox using standard FHIR API calls. We register a client in Aidbox with Basic Auth:

```json
{
  "resourceType": "Client",
  "id": "health-cards-client",
  "secret": "secret",
  "grant_types": ["basic"]
}
```

## Consequences
- **Positive**: Clean separation of concerns with Aidbox handling FHIR routing and our app handling health card generation
- **Positive**: Standard FHIR API integration allows leveraging existing tooling and patterns
- **Negative**: Requires managing authentication credentials for bidirectional communication
- **Negative**: Additional network calls for data retrieval may impact performance
