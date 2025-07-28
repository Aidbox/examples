# Task 3: Init Bundle Configuration

## Objective
Create init-bundle.json with App resource and AccessPolicies for $purge operation.

## File to create:
- `init-bundle.json`

## Resources to include:

### 1. App Resource
- **id**: purge-app
- **endpoint**: HTTP-RPC pointing to TypeScript service at host.docker.internal:3000
- **operations**: Define $purge operation mapping
  - method: POST
  - path: ["Patient", {"name": "id"}, "$purge"]

### 2. AccessPolicy for DELETE operations
- **id**: purge-delete-policy
- **engine**: matcho
- **matcho**: Allow DELETE method for purge-app client

### 3. AccessPolicy for $sql operations
- **id**: purge-sql-policy  
- **engine**: matcho
- **matcho**: Allow $sql endpoint access for purge-app client

## Bundle structure:
- Type: "transaction" (fail fast if any resource fails)
- Entry array with all resources

## Success criteria:
- Bundle loads without errors on Aidbox startup
- $purge endpoint is available via Aidbox
- Permissions are correctly configured
- Can make test calls to verify setup