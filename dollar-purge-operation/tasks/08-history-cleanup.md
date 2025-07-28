# Task 8: History Cleanup Implementation

## Objective
Implement deleteHistory() function using $sql operation to clean up history tables.

## Implementation location:
- `src/purgeHandler.ts` (extend existing file)

## Function signature:
```typescript
async function deleteHistory(
  patientId: string, 
  processedResourceTypes: string[]
): Promise<void>
```

## SQL Queries needed:

### 1. Patient history cleanup
```sql
DELETE FROM patient_history WHERE id = 'patient-id'
```

### 2. Related resources history cleanup
For each processed resource type:
```sql
DELETE FROM {resource_type}_history 
WHERE resource->>'subject' = 'Patient/{patientId}' 
   OR resource->>'patient' = 'Patient/{patientId}'
   OR resource->'subject'->>'reference' = 'Patient/{patientId}'
   OR resource->'patient'->>'reference' = 'Patient/{patientId}'
```

## $sql API usage:
- Endpoint: POST /$sql
- Body: { "query": "SQL_QUERY_HERE" }
- Headers: Authorization, Content-Type
- Handle response and errors

## Edge cases to handle:
- Different reference field patterns (subject, patient, etc.)
- JSONB query syntax for nested references
- Resources with multiple reference fields
- SQL injection prevention (use parameterized queries)

## Error handling:
- Continue with other queries if one fails
- Log SQL errors with context
- Don't fail entire operation if history cleanup fails
- Track which history tables were successfully cleaned

## Success criteria:
- All patient history is removed
- All related resource history is removed
- SQL queries execute without errors
- Proper error handling for SQL failures
- No SQL injection vulnerabilities