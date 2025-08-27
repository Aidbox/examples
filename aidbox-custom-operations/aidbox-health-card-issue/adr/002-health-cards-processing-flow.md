# ADR-002: Health Cards Processing Flow

## Status
Accepted

## Context
The main application needs to handle health card issuance requests efficiently while supporting incremental updates through the `_since` parameter. The processing must follow SMART Health Cards specifications for data bundling and cryptographic signing.

## Decision
We will implement a three-stage processing flow for health card generation:

### Processing Flow
1. **Receive Operation Request**: Accept health card issuance requests from Aidbox containing patient ID and optional parameters
2. **Data Retrieval**: Fetch required FHIR resources from Aidbox, with conditional logic for the `_since` parameter to support incremental updates
3. **Health Card Generation**: Create a FHIR Bundle and cryptographically sign it according to SMART Health Cards specifications

### Implementation Details
- Use the `_since` parameter to fetch only updated data when provided, improving performance for incremental updates
- Bundle all relevant patient data (immunizations, observations, diagnostic reports) into a FHIR Bundle
- Apply JWS (JSON Web Signature) to create a verifiable health card using ES256 algorithm
- Return the signed health card in the response
- **JWKS Publication**: Publish public keys as JSON Web Key Sets (JWKS) at `<<issuer>>/.well-known/jwks.json` with CORS enabled
- Use TLS 1.2 (following IETF BCP 195) or TLS 1.3 for JWKS endpoint security

## Consequences
- **Positive**: Efficient incremental updates reduce data transfer and processing time
- **Positive**: Follows SMART Health Cards standard for interoperability
- **Positive**: Cryptographic signing ensures data integrity and authenticity
- **Negative**: Requires careful management of signing keys and certificate chains
- **Negative**: Bundle size may become large for patients with extensive medical history
