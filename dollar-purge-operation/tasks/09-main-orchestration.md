# Task 9: Main Orchestration Function

## Objective
Implement processPurge() function that coordinates the entire 3-phase purge operation.

## Implementation location:
- `src/purgeHandler.ts` (extend existing file)

## Function signature:
```typescript
async function processPurge(
  operationId: string, 
  patientId: string
): Promise<void>
```

## Three phases:

### Phase 1: Delete Current Resources
```typescript
const processedResourceTypes: string[] = [];

for (const deletion of RESOURCE_DELETIONS) {
  const params = deletion.conditionalParams.replace('%s', patientId);
  const result = await deleteResourceType(deletion.resourceType, params, patientId);
  
  if (result.success) {
    processedResourceTypes.push(deletion.resourceType);
  }
  
  // Update progress
  updateOperationProgress(operationId, deletion.resourceType, result);
}
```

### Phase 2: Delete Patient
```typescript
await fetch(`${AIDBOX_URL}/Patient/${patientId}`, {
  method: 'DELETE',
  headers: { ... }
});
```

### Phase 3: Clean History
```typescript
await deleteHistory(patientId, processedResourceTypes);
```

## Progress tracking:
- Update operation status in memory Map
- Track current resource type being processed
- Count total and processed resources
- Log significant events

## Error handling:
- Try-catch around each phase
- Continue to next phase even if current fails partially
- Collect all errors for final OperationOutcome
- Mark operation as 'failed' only if major errors occur

## Final status update:
- Set status to 'completed' or 'failed'
- Generate comprehensive OperationOutcome
- Include statistics: total resources, deleted count, errors
- Set completedAt timestamp

## Success criteria:
- All three phases execute in correct order
- Progress is tracked and updated properly
- Error handling allows partial success
- Final status reflects actual result
- Memory storage is updated correctly