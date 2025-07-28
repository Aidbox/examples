# Task 4: TypeScript Types

## Objective
Create type definitions for the $purge operation.

## File to create:
- `src/types.ts`

## Interfaces needed:

### 1. PurgeOperation
```typescript
interface PurgeOperation {
  id: string;
  patientId: string;
  status: 'in-progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  progress: {
    totalResourceTypes: number;
    processedResourceTypes: number;
    currentResourceType?: string;
    deletedResourcesCount: number;
  };
  outcome?: OperationOutcome;
  errors: string[];
}
```

### 2. ResourceDeletion
```typescript
interface ResourceDeletion {
  resourceType: string;
  conditionalParams: string;
  historyTableName: string;
}
```

### 3. DeleteResult
```typescript
interface DeleteResult {
  success: boolean;
  method: 'conditional' | 'individual';
  count?: number;
  error?: string;
}
```

### 4. FHIR OperationOutcome
```typescript
interface OperationOutcome {
  resourceType: 'OperationOutcome';
  issue: Array<{
    severity: 'information' | 'warning' | 'error' | 'fatal';
    code: string;
    details: { text: string };
  }>;
}
```

## Success criteria:
- All interfaces are properly typed
- No TypeScript compilation errors
- Types support the full $purge workflow