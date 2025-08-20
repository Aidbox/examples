# FHIR $health-cards-issue Operation API Documentation

## Overview

This implementation provides the FHIR $health-cards-issue operation for generating SMART Health Cards from patient clinical data stored in Aidbox FHIR server.

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. Patient Health Cards Issue (FHIR Standard)

Generate health cards for a specific patient using the FHIR standard operation format.

```
POST /fhir/Patient/{id}/$health-cards-issue
```

#### Parameters

- `{id}` (path): Patient identifier

#### Request Body

FHIR Parameters resource containing operation parameters:

```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "credentialType",
      "valueString": "https://smarthealth.cards#immunization"
    },
    {
      "name": "credentialType", 
      "valueString": "https://smarthealth.cards#laboratory"
    },
    {
      "name": "_since",
      "valueInstant": "2021-01-01T00:00:00Z"
    },
    {
      "name": "_count",
      "valueInteger": 100
    },
    {
      "name": "includeIdentifier",
      "valueBoolean": true
    },
    {
      "name": "_outputFormat",
      "valueString": "application/smart-health-card"
    }
  ]
}
```

#### Supported Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `credentialType` | string | Yes | Type of credential to generate. Can be repeated for multiple types. |
| `_since` | instant | No | Include only resources updated after this date |
| `_count` | integer | No | Maximum number of resources to include (default: 100) |
| `includeIdentifier` | boolean | No | Whether to include patient identifiers (default: false) |
| `_outputFormat` | string | No | Output format: `application/smart-health-card` or `application/fhir+json` |

#### Supported Credential Types

- `https://smarthealth.cards#immunization` - Immunization records
- `https://smarthealth.cards#laboratory` - Laboratory results
- `https://smarthealth.cards#covid19` - COVID-19 specific records

#### Response (SMART Health Cards)

```json
{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "verifiableCredential",
      "valueString": "shc:/56762909524320603460292437404460...."
    },
    {
      "name": "verifiableCredential", 
      "valueString": "shc:/56762909524320603460292437404461...."
    }
  ]
}
```

#### Response (FHIR Bundle)

When `_outputFormat` is `application/fhir+json`:

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 3,
  "entry": [
    {
      "fullUrl": "Patient/test-patient-123",
      "resource": {
        "resourceType": "Patient",
        "id": "test-patient-123",
        ...
      }
    },
    {
      "fullUrl": "Immunization/covid-vaccine-1",
      "resource": {
        "resourceType": "Immunization",
        "id": "covid-vaccine-1",
        ...
      }
    }
  ]
}
```

### 2. Aidbox App Operation

Generate health cards through Aidbox App integration.

```
POST /aidbox/health-cards-issue
```

#### Request Body

Aidbox operation request format:

```json
{
  "resource": {
    "id": "test-patient-123",
    "resourceType": "Patient"
  },
  "params": {
    "body": {
      "resourceType": "Parameters",
      "parameter": [
        {
          "name": "credentialType",
          "valueString": "https://smarthealth.cards#immunization"
        }
      ]
    }
  }
}
```

#### Response

Same as FHIR standard operation response.

### 3. Health Check Endpoints

#### Application Health

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

#### Readiness Check

```
GET /ready
```

Response:
```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memoryUsage": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1441792
  }
}
```

#### Metrics

```
GET /metrics
```

Response:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memoryUsage": {...},
  "cpuUsage": {...},
  "nodeVersion": "v18.17.0",
  "environment": "production"
}
```

#### Aidbox Health Check

```
GET /aidbox/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "aidboxConnected": true,
  "version": "1.0.0"
}
```

#### Aidbox Connection Test

```
GET /aidbox/test-connection
```

Response:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "connected": true,
  "authenticated": true,
  "version": "23.1"
}
```

#### Aidbox Metrics

```
GET /aidbox/metrics
```

Response:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "health": {
    "overall": "healthy",
    "aidbox": {
      "status": "connected",
      "lastCheck": "2024-01-15T10:29:00.000Z",
      "successRate": 0.98,
      "avgResponseTime": 150
    },
    "operations": {
      "healthCardsIssue": {
        "totalInvocations": 125,
        "successRate": 0.96,
        "avgProcessingTime": 2500
      }
    },
    "alerts": []
  }
}
```

### 4. SMART Health Cards Metadata

#### JWKS Endpoint

```
GET /.well-known/jwks.json
```

Response:
```json
{
  "keys": [
    {
      "kty": "EC",
      "use": "sig",
      "crv": "P-256",
      "kid": "health-cards-key-2024",
      "x": "vxI0VgJBZLoGiLxW1K7MckYCfZS8E8z8-l6l8eE-PXw",
      "y": "GqR8qsJmObHwB1Q8U01YJT0-1TayGLs3F9uOqmE5L5c",
      "alg": "ES256"
    }
  ]
}
```

#### Issuer Metadata

```
GET /.well-known/smart-health-cards
```

Response:
```json
{
  "issuer": "https://your-domain.com",
  "jwks_uri": "https://your-domain.com/.well-known/jwks.json",
  "credentialSupported": [
    "https://smarthealth.cards#immunization",
    "https://smarthealth.cards#laboratory", 
    "https://smarthealth.cards#covid19"
  ]
}
```

## Error Handling

All errors are returned as FHIR OperationOutcome resources:

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "not-found",
      "diagnostics": "Patient with ID test-patient-123 not found"
    }
  ]
}
```

### Common Error Codes

| HTTP Status | FHIR Code | Description |
|-------------|-----------|-------------|
| 400 | `invalid` | Invalid request parameters |
| 400 | `required` | Missing required parameters |
| 401 | `security` | Authentication required |
| 403 | `forbidden` | Access denied |
| 404 | `not-found` | Patient or resource not found |
| 422 | `business-rule` | Business logic validation failed |
| 500 | `exception` | Internal server error |
| 503 | `timeout` | Service unavailable |

## Examples

### Example 1: Generate COVID-19 Immunization Cards

```bash
curl -X POST http://localhost:3000/fhir/Patient/patient-123/$health-cards-issue \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "credentialType",
        "valueString": "https://smarthealth.cards#immunization"
      },
      {
        "name": "includeIdentifier", 
        "valueBoolean": false
      }
    ]
  }'
```

### Example 2: Generate Laboratory Results with Date Filter

```bash
curl -X POST http://localhost:3000/fhir/Patient/patient-123/$health-cards-issue \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "credentialType",
        "valueString": "https://smarthealth.cards#laboratory"
      },
      {
        "name": "_since",
        "valueInstant": "2021-01-01T00:00:00Z"
      },
      {
        "name": "_count",
        "valueInteger": 50
      }
    ]
  }'
```

### Example 3: Get FHIR Bundle Instead of Health Cards

```bash
curl -X POST http://localhost:3000/fhir/Patient/patient-123/$health-cards-issue \
  -H "Content-Type: application/fhir+json" \
  -d '{
    "resourceType": "Parameters", 
    "parameter": [
      {
        "name": "credentialType",
        "valueString": "https://smarthealth.cards#immunization"
      },
      {
        "name": "_outputFormat",
        "valueString": "application/fhir+json"
      }
    ]
  }'
```

## Security Considerations

1. **Authentication**: Ensure proper authentication is configured for production use
2. **Patient Access Control**: Validate patient access permissions before generating health cards
3. **Key Management**: Protect private keys used for signing health cards
4. **Data Privacy**: Consider patient consent and privacy regulations
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## SMART Health Cards Compliance

This implementation follows the SMART Health Cards specification v1.2+:

- Uses ES256 signing algorithm
- Implements proper JWS structure
- Supports QR code encoding
- Validates FHIR Bundle structure
- Implements credential type filtering
- Supports deflate compression