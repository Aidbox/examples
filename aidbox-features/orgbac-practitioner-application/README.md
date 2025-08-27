---
features: [orgbac, jwt auth, practitioner app, nextjs, role based access]
languages: [typescript]
---
# Aidbox Organization-Based Access Control (OrgBAC) Practitioner Application

This is a complete example application demonstrating how to build a practitioner-facing healthcare application using Aidbox with Organization-Based Access Control (OrgBAC). The application showcases JWT authentication, organization-scoped data access, and FHIR R4 resource management.

## Architecture Overview

This application demonstrates:
- **JWT-based authentication** with Aidbox OAuth2 password grant
- **Organization-Based Access Control (OrgBAC)** - each practitioner gets their own organization with scoped data access
- **FHIR R4 compliance** using Aidbox as the backend FHIR server
- **Next.js 15** frontend with TypeScript and Tailwind CSS
- **Resource isolation** - practitioners can only access data within their organization

### Key Concepts

- **OrgBAC Pattern**: Each practitioner gets their own `Organization` resource, and all their data (patients, appointments, etc.) is scoped to that organization
- **JWT Authentication**: Custom JWT tokens with organization claims that match Aidbox AccessPolicies
- **Organization-scoped APIs**: Uses Aidbox's organization-based endpoints like `/Organization/{id}/fhir/Patient`

## Getting Started

### Prerequisites

- Docker 
- Node.js 18+ and npm

### Step 1: Start Aidbox

1. **Start the Aidbox container:**
   ```bash
   docker-compose up
   ```

2. **Login to Aidbox**

  - Wait till Aidbox starts
  - Open http://localhost:8080/
  - Login with Aidbox account

### Step 2: Install and Run the Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application:**
   ```bash
   npm run dev
   ```

3. **Open the application:**
   - Navigate to http://localhost:3000
   - You should see the login page

## 🔧 Aidbox Configuration Deep Dive

The application's Aidbox configuration is defined in [`aidbox-init-bundle.json`](./aidbox-init-bundle.json). This bundle is automatically loaded when Aidbox starts and sets up the necessary resources for the OrgBAC pattern.

### Configuration Components

#### 1. JWT Token Introspector

```json
{
  "resourceType": "TokenIntrospector",
  "id": "external-auth-server",
  "type": "jwt",
  "jwt": {
    "iss": "https://auth.example.com",
    "secret": "very-secret"
  }
}
```

**Purpose**: Configures Aidbox to validate JWT tokens issued by our application.
- `iss`: Must match the issuer in our JWT tokens (see [`lib/auth/jwt.ts`](./lib/auth/jwt.ts))
- `secret`: Shared secret for JWT verification (see [`lib/auth/jwt.ts`](./lib/auth/jwt.ts))

#### 2. Organization Access Policy

```json
{
  "resourceType": "AccessPolicy",
  "id": "organization-access",
  "description": "Access to Organization Based API for Practitioner",
  "engine": "matcho",
  "matcho": {
    "jwt": {
      "organization": ".params.organization/id",
      "iss": "https://auth.example.com"
    }
  }
}
```

**Purpose**: Enables organization-scoped access to FHIR resources.
- Matches JWT tokens with `organization` claim to organization path parameters
- Allows access to `/Organization/{id}/fhir/*` endpoints only when JWT `organization` claim matches the `{id}`

#### 3. Organization Creation Policy

```json
{
  "resourceType": "AccessPolicy",
  "id": "create-organization",
  "description": "Can create organization outside of OrgBAC API",
  "engine": "matcho",
  "matcho": {
    "jwt": {
      "iss": "https://auth.example.com"
    },
    "request-method": "post",
    "params": {
      "resource/type": "Organization"
    }
  }
}
```

**Purpose**: Allows creating `Organization` resources outside the organization-scoped API during registration.

#### 4. OAuth2 Client

```json
{
  "resourceType": "Client",
  "id": "log-in-practitioner",
  "secret": "secret",
  "grant_types": ["password"]
}
```

**Purpose**: OAuth2 client for password grant authentication during login.

#### 5. Login Access Policy

```json
{
  "resourceType": "AccessPolicy",
  "id": "log-in-practitioner",
  "engine": "matcho",
  "matcho": {
    "jwt": {
      "client": "log-in-practitioner"
    }
  },
  "link": [
    {
      "reference": "/Operation/auth-token"
    }
  ]
}
```

**Purpose**: Allows the OAuth2 client to access the token endpoint for authentication.

## Application Walkthrough

### Request Logging

All requests to Aidbox are logged to the terminal for debugging purposes. You can see:
- **Request details**: Method, URL, headers (excluding sensitive data)
- **Response status**: HTTP status codes and success/failure
- **Response data**: JSON responses from Aidbox

This helps you understand the exact interaction between the application and Aidbox server. Look for log entries like:
```
[Aidbox Request] POST /Organization/org-123/fhir/Patient
[Aidbox Response] 201 Created
```

### Registration Flow

Navigate to http://localhost:3000/register to start the registration process.

#### Step 1: Fill Registration Form

The registration form ([`components/forms/RegisterForm.tsx`](./components/forms/RegisterForm.tsx)) collects:
- First Name
- Last Name  
- Email
- Password

**Note**: Organization name is automatically generated using the practitioner's name.

#### Step 2: Registration API Call

When submitted, the form sends a POST request to [`app/api/auth/register/route.ts`](./app/api/auth/register/route.ts).

**Key Implementation Details:**

1. **Temporary JWT Creation** (Lines 41-48):
   ```typescript
   const tempToken = await jwtService.generateToken({
     userId: tempUserId,
     email,
     practitionerRoleId: 'temp',
     organizationId: 'temp'
   })
   ```
   
2. **User Existence Check** (Lines 52-75):
   ```typescript
   const userCheckResponse = await fetch(`${AIDBOX_URL}/fhir/User?email=${encodeURIComponent(email)}`, {
     headers: {
       'Authorization': `Bearer ${tempToken}`,
       'Content-Type': 'application/json'
     }
   })
   ```

3. **Organization Creation** (Lines 77-123):
   ```typescript
   const orgResponse = await fetch(`${AIDBOX_URL}/fhir/Organization`, {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${tempToken}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(orgRequestBody)
   })
   ```
   
   **Important**: Uses regular `/fhir/Organization` endpoint (not organization-scoped) because the organization doesn't exist yet.

4. **Organization-scoped JWT Creation** (Lines 125-131):
   ```typescript
   const orgToken = await jwtService.generateToken({
     userId: tempUserId,
     email,
     practitionerRoleId: 'temp',
     organizationId: organization.id  // Now has real organization ID
   })
   ```

5. **Practitioner Creation** (Lines 133-158):
   ```typescript
   const practitionerResponse = await fetch(`${AIDBOX_URL}/Organization/${organization.id}/fhir/Practitioner`, {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${orgToken}`,
       'Content-Type': 'application/json'
     },
     // ... practitioner data
   })
   ```
   
   **Important**: Uses organization-scoped endpoint `/Organization/{id}/fhir/Practitioner`

6. **PractitionerRole Creation** (Lines 160-179):
   ```typescript
   const practitionerRoleResponse = await fetch(`${AIDBOX_URL}/Organization/${organization.id}/fhir/PractitionerRole`, {
     // Links Practitioner to Organization
   })
   ```

7. **User Creation** (Lines 181-202):
   ```typescript
   const userResponse = await fetch(`${AIDBOX_URL}/Organization/${organization.id}/fhir/User`, {
     // Aidbox User for authentication
   })
   ```

**Registration Success**: Redirects to login page (no auto-login for security).

### Login Flow

Navigate to http://localhost:3000/login after registration.

#### Step 1: Login Form Submission

The login form ([`components/forms/LoginForm.tsx`](./components/forms/LoginForm.tsx)) sends credentials to [`app/api/auth/login/route.ts`](./app/api/auth/login/route.ts).

#### Step 2: OAuth2 Password Grant Authentication

**Key Implementation** ([`lib/aidbox/client.ts`](./lib/aidbox/client.ts), Lines 184-234):

```typescript
async authenticateUser(email: string, password: string) {
  const authPayload = {
    grant_type: 'password',
    username: email,
    password: password,
    client_id: AIDBOX_CLIENT_ID,        // 'log-in-practitioner'
    client_secret: AIDBOX_CLIENT_SECRET // 'secret'
  }
  
  const response = await fetch(`${AIDBOX_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authPayload)
  })
  
  const result = await response.json()
  
  if (result.access_token && result.userinfo) {
    // Extract organization ID from user metadata
    const organizationId = extractOrganizationId(result.userinfo)
    
    return {
      user: result.userinfo,
      authenticated: true,
      access_token: result.access_token,
      organizationId
    }
  }
}
```

**Critical Points**:
- Uses OAuth2 password grant (NOT basic auth)
- Only the login process uses Aidbox's OAuth2 - all other operations use our JWT tokens
- Organization ID is extracted from the authenticated user's metadata

#### Step 3: Session Creation

After successful authentication, the login API creates a JWT session token using [`lib/auth/session.ts`](./lib/auth/session.ts):

```typescript
const token = await sessionService.createSession({
  userId: user.id,
  email: user.email,
  practitionerRoleId: practitionerRoleId,
  organizationId  // Critical: includes organization claim
})
```

This JWT token will be used for all subsequent API calls.

### Dashboard Access

After successful login, users are redirected to the dashboard at http://localhost:3000/dashboard.

#### Middleware Protection

All dashboard routes are protected by [`middleware.ts`](./middleware.ts):

```typescript
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    const payload = await jwtService.verifyToken(token)
    
    // Add organization and user info to request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-organization-id', payload.organizationId)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('Authorization', `Bearer ${token}`)
    
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

**Key Features**:
- Verifies JWT token from httpOnly cookie
- Adds organization ID and JWT token to request headers
- Redirects unauthenticated users to login

#### Dashboard Stats API

The dashboard loads statistics via [`app/api/dashboard/stats/route.ts`](./app/api/dashboard/stats/route.ts):

```typescript
export async function GET(request: NextRequest) {
  // Get organization ID and JWT from middleware headers
  const organizationId = request.headers.get('x-organization-id')
  const jwtToken = authHeader?.replace('Bearer ', '')
  
  // Create Aidbox client with JWT token
  const aidbox = new AidboxClient(organizationId, jwtToken)
  
  // Count patients in this organization
  const patientCount = await aidbox.countResources('Patient')
  
  return NextResponse.json({
    totalPatients: patientCount,
    todayAppointments: 0,    // Mock data
    pendingTasks: 0          // Mock data
  })
}
```

**Aidbox Interaction** ([`lib/aidbox/client.ts`](./lib/aidbox/client.ts), Lines 309-337):

```typescript
async countResources(resourceType: string): Promise<number> {
  const searchParams = new URLSearchParams()
  searchParams.set('_count', '0')
  searchParams.set('_total', 'accurate')
  
  const endpoint = this.getResourceEndpoint(resourceType)  // Organization/{id}/fhir/Patient
  const bundle = await this.makeRequest(`${endpoint}?${searchParams.toString()}`)
  
  return bundle.total || 0
}

private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${AIDBOX_URL}/${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  }

  if (this.jwtToken) {
    headers['Authorization'] = `Bearer ${this.jwtToken}`  // Uses our JWT, not Aidbox OAuth
  }

  const response = await fetch(url, { ...options, headers })
  // ... error handling and response parsing
}
```

**Request Flow**:
1. Client sends JWT token with organization claim
2. Aidbox validates JWT using TokenIntrospector
3. AccessPolicy matches organization claim to URL parameter
4. Request allowed only for practitioner's organization data

### Patient Management

Navigate to http://localhost:3000/patients to view the patient list.

#### Patient List API

The patient list loads via [`app/api/patients/route.ts`](./app/api/patients/route.ts) GET endpoint:

```typescript
export async function GET(request: NextRequest) {
  const organizationId = request.headers.get('x-organization-id')
  const jwtToken = authHeader?.replace('Bearer ', '')
  
  const aidbox = new AidboxClient(organizationId, jwtToken)
  
  // Search for patients in this organization only
  const searchParams: Record<string, string> = {
    '_count': limit.toString()
  }
  
  if (search) {
    searchParams['name'] = search  // FHIR search parameter
  }
  
  const bundle = await aidbox.searchResources<Patient>('Patient', searchParams)
  const patients = bundle.entry?.map(entry => entry.resource) || []
  
  return NextResponse.json({ 
    patients: transformedPatients,
    totalPages, 
    currentPage: page,
    total: patients.length
  })
}
```

**Aidbox Search Request** ([`lib/aidbox/client.ts`](./lib/aidbox/client.ts), Lines 241-261):

```typescript
async searchResources<T>(resourceType: string, searchParams?: Record<string, string>) {
  const params = new URLSearchParams(searchParams)
  const endpoint = this.getResourceEndpoint(resourceType)  // Organization/{id}/fhir/Patient
  const queryString = params.toString()
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint
  
  return this.makeRequest(fullEndpoint)  // GET /Organization/{orgId}/fhir/Patient?name=john&_count=10
}
```

#### Creating New Patients

Click "Add New Patient" to navigate to http://localhost:3000/patients/new.

The new patient form ([`app/(dashboard)/patients/new/page.tsx`](./app/(dashboard)/patients/new/page.tsx)) submits to the patients API POST endpoint:

```typescript
export async function POST(request: NextRequest) {
  const organizationId = request.headers.get('x-organization-id')
  const jwtToken = authHeader?.replace('Bearer ', '')
  const patientData = await request.json()
  
  const aidbox = new AidboxClient(organizationId, jwtToken)
  
  // Create patient in practitioner's organization
  const createdPatient = await aidbox.createPatient(patientResource)
  
  return NextResponse.json(createdPatient)
}
```

**Patient Creation** ([`lib/aidbox/client.ts`](./lib/aidbox/client.ts), Lines 278-301):

```typescript
async createPatient(data: any): Promise<any> {
  if (!this.organizationId || !this.jwtToken) {
    throw new Error('Organization ID and JWT token are required for patient creation')
  }

  const endpoint = this.getResourceEndpoint('Patient')  // Organization/{id}/fhir/Patient
  return this.makeRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
```

**Final Request**: `POST /Organization/{orgId}/fhir/Patient` with JWT authorization.

## Security Model

### JWT Token Structure

All JWT tokens issued by the application ([`lib/auth/jwt.ts`](./lib/auth/jwt.ts)) include:

```typescript
{
  "sub": "user-id",
  "email": "practitioner@example.com",
  "organization": "org-123",           // Critical: organization claim
  "practitionerRoleId": "role-456",
  "iss": "https://auth.example.com",   // Must match TokenIntrospector
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Access Control Flow

1. **Request arrives** at organization-scoped endpoint: `/Organization/org-123/fhir/Patient`
2. **Aidbox extracts JWT** from Authorization header
3. **TokenIntrospector validates JWT** using shared secret and issuer
4. **AccessPolicy engine matches**:
   - JWT `organization` claim (`org-123`) 
   - URL parameter `organization/id` (`org-123`)
   - JWT `iss` claim matches configured issuer
5. **Access granted** only if all conditions match

### Data Isolation

- Each practitioner can only access resources within their organization
- Organization ID in JWT must match organization ID in URL path
- No cross-organization data access possible
- Resources are automatically scoped to the practitioner's organization

## Development Notes

### Environment Variables

Create `.env.local` with:

```bash
# Aidbox Configuration
AIDBOX_URL=http://localhost:8080
AIDBOX_CLIENT_ID=log-in-practitioner
AIDBOX_CLIENT_SECRET=secret

# JWT Configuration (must match aidbox-init-bundle.json)
JWT_SECRET=very-secret
JWT_ISSUER=https://auth.example.com

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### Key Files

- **Aidbox Config**: [`aidbox-init-bundle.json`](./aidbox-init-bundle.json) - Aidbox setup
- **Authentication**: [`lib/auth/`](./lib/auth/) - JWT and session management  
- **Aidbox Client**: [`lib/aidbox/client.ts`](./lib/aidbox/client.ts) - Aidbox API wrapper
- **API Routes**: [`app/api/`](./app/api/) - Next.js API endpoints
- **Middleware**: [`middleware.ts`](./middleware.ts) - Route protection
- **Types**: [`fhir.r4.sdk/types/`](./fhir.r4.sdk/types/) - FHIR and custom types




