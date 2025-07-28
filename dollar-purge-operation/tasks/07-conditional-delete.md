# Task 7: Conditional DELETE Implementation

## Objective
Implement deleteResourceType() function with Conditional DELETE and fallback mechanism.

## Implementation location:
- `src/purgeHandler.ts` (new file)

## Function signature:
```typescript
async function deleteResourceType(
  resourceType: string, 
  conditionalParams: string, 
  patientId: string
): Promise<DeleteResult>
```

## Logic flow:

### 1. Primary: Conditional DELETE
```http
DELETE /ResourceType?conditional-params
```
- Try conditional delete first
- Return success if 200/204 response
- Count deleted resources from response headers if available

### 2. Fallback: Individual DELETE
If conditional delete fails with:
- 412 Precondition Failed (multiple matches)
- Other 4xx/5xx errors

Then:
1. GET /ResourceType?conditional-params
2. Parse bundle response
3. DELETE each resource individually: DELETE /ResourceType/{id}
4. Return aggregate results

## Error handling:
- Catch network errors
- Handle Aidbox-specific error responses
- Log detailed error information
- Continue processing other resource types even if one fails

## Aidbox integration:
- Use fetch() for HTTP requests
- Basic auth with configured credentials
- Proper headers: Content-Type, Authorization
- Handle Aidbox response formats

## Success criteria:
- Conditional DELETE works for simple cases
- Fallback handles multiple matches correctly
- Proper error handling and logging
- Returns detailed results for tracking
- Integration with Aidbox API works