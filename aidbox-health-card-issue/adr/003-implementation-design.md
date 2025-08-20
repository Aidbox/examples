# ADR-003: Implementation Design for $health-cards-issue Operation

## Status
Proposed

## Context
Based on the existing architectural decisions (ADR-001 and ADR-002) and SMART Health Cards specification analysis, we need to design a minimal, focused implementation of the `$health-cards-issue` FHIR operation. The implementation should leverage the established Aidbox integration patterns while providing core health card generation functionality.

## Decision

### High-Level Architecture
```
Client → Aidbox → Node.js App → Aidbox (data fetch) → Health Card Generation → Response
```

### Core Components

#### 1. Application Structure
```
src/
├── server.ts              # Express server setup
├── handlers/
│   └── health-cards.ts    # Main operation handler
├── services/
│   ├── fhir-client.ts     # Aidbox FHIR client
│   ├── bundle-builder.ts  # FHIR Bundle creation
│   └── health-card.ts     # Health card generation & signing
├── types/
│   ├── operation.ts       # Operation request/response types
│   └── health-card.ts     # Health card related types
└── utils/
    ├── crypto.ts          # JWS signing utilities
    └── validation.ts      # Input validation
```

#### 2. Request Flow Implementation

**Step 1: Operation Handler** (`handlers/health-cards.ts`)
- Validate incoming Aidbox operation request
- Extract patient ID from route parameters
- Parse operation parameters (`credentialType`, `_since`, etc.)
- Coordinate the health card generation process

**Step 2: FHIR Data Retrieval** (`services/fhir-client.ts`)
- Authenticate with Aidbox using Basic Auth client credentials
- Fetch patient data based on `credentialType` parameter:
  - `Immunization`: Fetch Immunization resources
  - `Observation`: Fetch Observation resources (lab results)
  - Multiple types: Fetch all specified types
- Apply `_since` filter if provided for incremental updates

**Step 3: Bundle Creation** (`services/bundle-builder.ts`)
- Create FHIR Bundle with fetched resources
- Include patient demographics (identity claims based on `includeIdentityClaim`)
- Apply `credentialValueSet` filters if specified
- Ensure Bundle compliance with SMART Health Cards requirements

**Step 4: Health Card Generation** (`services/health-card.ts`)
- Generate JWS (JSON Web Signature) from FHIR Bundle
- Use ES256 algorithm with stored private key
- Create verifiable credential structure
- Return signed health card in SMART Health Cards format

#### 3. Key Implementation Details

**Configuration Management**
```typescript
interface Config {
  aidbox: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
  };
  healthCards: {
    issuer: string;
    keyPath: string;
  };
  server: {
    port: number;
    secret: string; // For Aidbox App authentication
  };
}
```

**Operation Request Handling**
```typescript
interface OperationRequest {
  type: string;
  operation: {
    id: string;
  };
  request: {
    params: {
      credentialType?: string[];
      credentialValueSet?: string;
      includeIdentityClaim?: string;
      _since?: string;
    };
    'route-params': {
      id: string; // Patient ID
    };
    headers: Record<string, any>;
  };
}
```

**Health Card Response**
```typescript
interface HealthCardResponse {
  resourceType: 'Parameters';
  parameter: [
    {
      name: 'verifiableCredential';
      valueString: string; // JWS-signed health card
    }
  ];
}
```

#### 4. Minimal Feature Set

**Core Features:**
- Support for `Immunization` and `Observation` credential types
- Basic identity claims (patient name, DOB)
- JWS signing with ES256 algorithm
- `_since` parameter for incremental updates

**Additional Required Features:**
- JWKS endpoint at `/.well-known/jwks.json` for public key publication (per SMART Health Cards spec)
- CORS-enabled HTTPS endpoint with TLS 1.2+ security

**Out of Scope (for minimal implementation):**
- Complex credential value set filtering
- Multiple issuer support
- Advanced identity claim configurations
- Resource linking (`resourceLink` parameter)

#### 5. Error Handling Strategy

**Input Validation:**
- Validate required `credentialType` parameter
- Sanitize patient ID input
- Validate date format for `_since` parameter

**FHIR Client Errors:**
- Handle authentication failures gracefully
- Manage API rate limiting
- Provide meaningful error responses for missing resources

**Cryptographic Errors:**
- Validate key availability at startup
- Handle signing failures with appropriate error codes

#### 6. Security Considerations

**Authentication:**
- Validate Aidbox App secret on incoming requests
- Use secure storage for private keys
- Implement request timeout and rate limiting

**Data Privacy:**
- Minimize patient data in logs
- Ensure secure transmission of health cards
- Validate patient access permissions through Aidbox

### Testing Strategy

1. **Unit Tests:** Core business logic (bundle creation, health card generation)
2. **Integration Tests:** Aidbox communication and end-to-end operation flow
3. **Compliance Tests:** SMART Health Cards specification compliance

### Deployment Configuration

**Docker Setup:**
- Single container with Node.js application
- Private key mounted as volume
- Environment-based configuration

**Aidbox Configuration:**
- App resource for operation routing
- Client resource for FHIR API access
- Init bundle for automated setup

## Consequences

**Positive:**
- Minimal, focused implementation reduces complexity
- Clear separation of concerns enables easy testing
- Follows established patterns from existing ADRs
- Compliant with SMART Health Cards specification

**Negative:**
- Limited feature set may require future extensions
- Dependency on external cryptographic libraries
- Network latency for data retrieval may impact performance

**Risks:**
- Key management complexity
- Aidbox API changes could break integration
- Scaling limitations with current architecture

## Implementation Priority

1. **Phase 1:** Basic operation handler and FHIR client
2. **Phase 2:** Bundle creation and health card generation
3. **Phase 3:** Error handling and validation
4. **Phase 4:** Testing and compliance verification
