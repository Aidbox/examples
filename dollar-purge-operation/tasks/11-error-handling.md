# Task 11: Comprehensive Error Handling

## Objective
Add robust error handling for all failure scenarios in the $purge operation.

## Implementation location:
- Throughout `src/purgeHandler.ts` and `src/index.ts`

## Error scenarios to handle:

### 1. Multiple Matches Error (412)
- Conditional DELETE returns 412 Precondition Failed
- Implement fallback to individual DELETE
- Log the fallback usage for monitoring

### 2. Network/Connection Errors
- Aidbox server unavailable
- Network timeouts
- Connection refused
- Implement retry logic with exponential backoff

### 3. Authentication/Authorization Errors
- 401 Unauthorized
- 403 Forbidden
- Invalid credentials
- Should fail fast, don't retry

### 4. Resource Not Found Errors
- 404 for patient or related resources
- Handle gracefully, continue with other resources
- Log for audit trail

### 5. SQL Errors
- Invalid SQL syntax
- Database connection issues
- Constraint violations
- Log detailed error, continue operation

### 6. Partial Failures
- Some resources deleted, others failed
- Track which resources were successfully processed
- Generate detailed OperationOutcome

## Error response handling:
```typescript
function handleAidboxError(response: Response, context: string): Error {
  // Parse Aidbox error response
  // Create meaningful error message
  // Include response status and body
}
```

## Retry logic:
```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T>
```

## Error aggregation:
- Collect all errors during operation
- Include in final OperationOutcome
- Categorize by severity (warning vs error)
- Provide actionable error messages

## Logging:
- Use console.error for errors
- Include operation ID and context
- Log timing information
- Include request/response details for debugging

## Success criteria:
- All error scenarios are handled gracefully
- Partial failures don't crash the operation
- Detailed error information is provided
- Retry logic works for transient failures
- Operations can recover from individual failures