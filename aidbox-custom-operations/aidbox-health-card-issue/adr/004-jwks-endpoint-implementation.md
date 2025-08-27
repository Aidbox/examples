# ADR-004: JWKS Endpoint Implementation

## Status
Accepted

## Context
According to SMART Health Cards specification, issuers SHALL publish their public keys as JSON Web Key Sets (JWKS) to enable verification of issued health cards. This is a critical requirement for interoperability and trust in the health card ecosystem.

## Decision
We will implement a JWKS endpoint that publishes our public keys according to RFC 7517 specifications.

### JWKS Endpoint Requirements
- **Endpoint URL**: `<<issuer>>/.well-known/jwks.json`
- **Protocol**: HTTPS with TLS 1.2 (following IETF BCP 195) or TLS 1.3
- **CORS**: Cross-Origin Resource Sharing (CORS) enabled
- **Content-Type**: `application/json`
- **Cache Headers**: Appropriate caching headers for public key stability

### Implementation Approach

#### 1. JWKS Generation
```typescript
interface JWK {
  kty: 'EC';
  use: 'sig';
  crv: 'P-256';
  kid: string;
  x: string;
  y: string;
  alg: 'ES256';
}

interface JWKS {
  keys: JWK[];
}
```

#### 2. Endpoint Implementation
- Add `GET /.well-known/jwks.json` route to Express server
- Generate JWKS from public key file at startup
- Serve JWKS with appropriate CORS headers
- Include cache-control headers for reasonable caching (e.g., 24 hours)

#### 3. Key Management
- Use existing public key from `./keys/public-key.pem`
- Convert PEM format to JWK format for JWKS publication
- Assign consistent `kid` (Key ID) for key identification
- Support key rotation by maintaining multiple keys in JWKS

#### 4. Security Considerations
- Public keys are safe to expose publicly
- Implement rate limiting to prevent abuse
- Monitor access patterns for security insights
- Ensure TLS configuration meets security requirements

### Configuration Updates
- Add JWKS-specific configuration options
- Update server startup to validate public key availability
- Configure CORS policies for `.well-known` endpoints

### Testing Strategy
- Verify JWKS format compliance with RFC 7517
- Test CORS headers are properly set
- Validate key can be used to verify issued JWS tokens
- Test endpoint availability and performance

## Consequences

**Positive:**
- Enables verification of issued health cards by any consumer
- Follows SMART Health Cards specification requirements
- Supports standard cryptographic verification workflows
- Allows for proper key rotation and management

**Negative:**
- Adds public endpoint that must be maintained and secured
- Requires proper TLS configuration and certificate management
- Public key exposure (though this is by design and safe)

**Implementation Priority:**
- High priority - required for SMART Health Cards compliance
- Must be implemented before production deployment
- Should be included in automated testing and monitoring

## References
- [RFC 7517 - JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [SMART Health Cards Framework](https://spec.smarthealth.cards/)
- [IETF BCP 195 - Recommendations for Secure Use of Transport Layer Security (TLS)](https://tools.ietf.org/html/bcp195)