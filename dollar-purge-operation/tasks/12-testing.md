# Task 12: End-to-End Testing

## Objective
Test the complete $purge operation to ensure it works correctly with real data.

## Testing phases:

### Phase 1: Setup Test Data
Create test patient with related resources:
```http
POST /Patient
{
  "resourceType": "Patient",
  "name": [{"given": ["Test"], "family": "Patient"}],
  "birthDate": "1990-01-01"
}

POST /Observation
{
  "resourceType": "Observation",
  "status": "final",
  "code": {"text": "Test observation"},
  "subject": {"reference": "Patient/{test-patient-id}"}
}

POST /Encounter
{
  "resourceType": "Encounter",
  "status": "finished",
  "class": {"code": "AMB"},
  "subject": {"reference": "Patient/{test-patient-id}"}
}
```

### Phase 2: Execute $purge Operation
```http
POST /Patient/{test-patient-id}/$purge
```

### Phase 3: Verify Results
1. **Check operation status**: GET /purge-status/{operation-id}
2. **Verify patient deleted**: GET /Patient/{test-patient-id} should return 404
3. **Verify related resources deleted**: Search for Observations, Encounters, etc.
4. **Verify history cleanup**: Check that history tables are empty

### Phase 4: Test Error Scenarios

#### 4.1 Non-existent Patient
```http
POST /Patient/non-existent-id/$purge
```
Should return appropriate error.

#### 4.2 Patient with Complex References
Create patient with multiple resource types and complex relationships.

#### 4.3 Concurrent Operations
Start multiple $purge operations simultaneously to test thread safety.

## Test cases:

### 1. Basic Happy Path
- Patient with 5-10 related resources
- All resources should be deleted
- History should be cleaned up
- Operation should complete successfully

### 2. Large Dataset
- Patient with 100+ related resources
- Test performance and memory usage
- Verify progress tracking works

### 3. Partial Failures
- Modify one resource to cause deletion failure
- Verify operation continues with other resources
- Check error reporting in OperationOutcome

### 4. Empty Patient
- Patient with no related resources
- Should still delete patient and complete successfully

## Verification queries:
```sql
-- Check current resources
SELECT COUNT(*) FROM observation WHERE resource->>'subject' = 'Patient/{id}';

-- Check history cleanup
SELECT COUNT(*) FROM observation_history WHERE resource->>'subject' = 'Patient/{id}';
```

## Success criteria:
- All test patients and related resources are completely removed
- History tables are properly cleaned up
- Operation status tracking works correctly
- Error scenarios are handled appropriately
- Performance is acceptable for large datasets
- No memory leaks or server crashes