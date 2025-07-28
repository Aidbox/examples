# Task 10: Operation Status Tracking

## Objective
Implement in-memory storage system for tracking purge operation status and progress.

## Implementation location:
- `src/purgeHandler.ts` (extend existing file)

## Storage structure:
```typescript
const purgeOperations = new Map<string, PurgeOperation>();
```

## Helper functions needed:

### 1. createOperation()
```typescript
function createOperation(patientId: string): string {
  const operationId = generateOperationId();
  const operation: PurgeOperation = {
    id: operationId,
    patientId,
    status: 'in-progress',
    startedAt: new Date(),
    progress: {
      totalResourceTypes: RESOURCE_DELETIONS.length,
      processedResourceTypes: 0,
      deletedResourcesCount: 0
    },
    errors: []
  };
  purgeOperations.set(operationId, operation);
  return operationId;
}
```

### 2. updateOperationProgress()
```typescript
function updateOperationProgress(
  operationId: string,
  currentResourceType: string,
  result: DeleteResult
): void
```

### 3. completeOperation()
```typescript
function completeOperation(
  operationId: string,
  status: 'completed' | 'failed',
  outcome?: OperationOutcome
): void
```

### 4. getOperation()
```typescript
function getOperation(operationId: string): PurgeOperation | undefined
```

## Operation ID generation:
- Use crypto.randomUUID() or similar
- Ensure uniqueness
- URL-safe format

## Memory management:
- Optional: Auto-cleanup old operations (e.g., after 24 hours)
- Optional: Maximum number of stored operations
- Consider memory usage for long-running server

## Thread safety:
- Operations Map should be safe for concurrent access
- Individual operation updates should be atomic

## Success criteria:
- Operations are properly tracked from start to finish
- Progress updates work correctly
- Status can be retrieved at any time
- Memory usage is reasonable
- Concurrent operations don't interfere