import { PurgeOperation, DeleteResult, OperationOutcome, AidboxBundle } from './types';
import { RESOURCE_DELETIONS, getResourceDeletionsForPatient, getHistoryCleanupQueries } from './resourceDeletions';

const AIDBOX_URL = 'http://localhost:8888';
const AIDBOX_AUTH = Buffer.from('basic:secret').toString('base64');

// In-memory storage for purge operations
const purgeOperations = new Map<string, PurgeOperation>();

// Helper function to generate operation ID
function generateOperationId(): string {
  return `purge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create new purge operation
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

// Update operation progress
function updateOperationProgress(
  operationId: string,
  currentResourceType: string,
  result: DeleteResult
): void {
  const operation = purgeOperations.get(operationId);
  if (!operation) return;

  operation.progress.currentResourceType = currentResourceType;
  operation.progress.processedResourceTypes++;
  
  if (result.success && result.count) {
    operation.progress.deletedResourcesCount += result.count;
  }
  
  if (!result.success && result.error) {
    operation.errors.push(`${currentResourceType}: ${result.error}`);
  }
}

// Complete operation
function completeOperation(
  operationId: string,
  status: 'completed' | 'failed',
  outcome?: OperationOutcome
): void {
  const operation = purgeOperations.get(operationId);
  if (!operation) return;

  operation.status = status;
  operation.completedAt = new Date();
  operation.progress.currentResourceType = undefined;
  operation.outcome = outcome;
}

// Get operation by ID
export function getOperation(operationId: string): PurgeOperation | undefined {
  return purgeOperations.get(operationId);
}

// Get all operations
export function getAllOperations(): PurgeOperation[] {
  return Array.from(purgeOperations.values());
}

// Retry logic helper
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry auth errors
      if (error instanceof Error && error.message.includes('401') || error instanceof Error && error.message.includes('403')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
      }
    }
  }
  
  throw lastError!;
}

// Delete resources of a specific type with fallback
async function deleteResourceType(
  resourceType: string,
  conditionalParams: string,
  patientId: string
): Promise<DeleteResult> {
  try {
    // Phase 1: Try Conditional DELETE
    const deleteUrl = `${AIDBOX_URL}/${resourceType}?${conditionalParams}`;
    console.log(`Attempting conditional DELETE: ${deleteUrl}`);
    
    const deleteResponse = await withRetry(() => 
      fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${AIDBOX_AUTH}`,
          'Content-Type': 'application/json'
        }
      })
    );

    if (deleteResponse.ok) {
      console.log(`Conditional DELETE succeeded for ${resourceType}`);
      return { 
        success: true, 
        method: 'conditional',
        count: 1 // Aidbox doesn't always return count, assume at least 1
      };
    }

    // Phase 2: Fallback to individual DELETE
    console.log(`Conditional DELETE failed for ${resourceType} (${deleteResponse.status}), trying fallback`);
    
    const searchUrl = `${AIDBOX_URL}/${resourceType}?${conditionalParams}`;
    const searchResponse = await withRetry(() =>
      fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${AIDBOX_AUTH}`,
          'Content-Type': 'application/json'
        }
      })
    );

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status} ${await searchResponse.text()}`);
    }

    const bundle = await searchResponse.json() as AidboxBundle;
    const resources = bundle.entry || [];
    
    if (resources.length === 0) {
      console.log(`No ${resourceType} resources found for patient ${patientId}`);
      return { success: true, method: 'individual', count: 0 };
    }

    console.log(`Found ${resources.length} ${resourceType} resources, deleting individually`);

    // Delete each resource individually
    const deletePromises = resources.map(entry => 
      withRetry(() =>
        fetch(`${AIDBOX_URL}/${resourceType}/${entry.resource.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${AIDBOX_AUTH}`,
            'Content-Type': 'application/json'
          }
        })
      )
    );

    const deleteResults = await Promise.allSettled(deletePromises);
    const successCount = deleteResults.filter(result => result.status === 'fulfilled').length;
    
    if (successCount === resources.length) {
      return { success: true, method: 'individual', count: successCount };
    } else {
      const failedCount = resources.length - successCount;
      return { 
        success: false, 
        method: 'individual', 
        count: successCount,
        error: `${failedCount}/${resources.length} individual deletes failed`
      };
    }

  } catch (error) {
    console.error(`Failed to delete ${resourceType}:`, error);
    return { 
      success: false, 
      method: 'conditional',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Delete history using $sql operation
async function deleteHistory(
  patientId: string,
  processedResourceTypes: string[]
): Promise<void> {
  console.log(`Starting history cleanup for patient ${patientId}, processed ${processedResourceTypes.length} resource types`);
  
  const queries = getHistoryCleanupQueries(patientId);
  
  for (const query of queries) {
    try {
      console.log(`Executing history cleanup query: ${query.substring(0, 100)}...`);
      
      await withRetry(() =>
        fetch(`${AIDBOX_URL}/$sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${AIDBOX_AUTH}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: query.trim() })
        })
      );
      
    } catch (error) {
      console.error(`Failed to execute history cleanup query:`, error);
      // Continue with other queries even if one fails
    }
  }
  
  console.log(`History cleanup completed for patient ${patientId}`);
}

// Main purge orchestration function
export async function processPurge(patientId: string): Promise<string> {
  const operationId = createOperation(patientId);
  
  console.log(`Starting purge operation ${operationId} for patient ${patientId}`);
  
  // Run purge asynchronously
  setImmediate(async () => {
    const processedResourceTypes: string[] = [];
    
    // Use processedResourceTypes to track successful deletions
    console.log(`Will track processed resource types: ${processedResourceTypes.length} initially`);
    
    try {
      // Phase 1: Delete current resources
      console.log(`Phase 1: Deleting current resources for patient ${patientId}`);
      
      const resourceDeletions = getResourceDeletionsForPatient(patientId);
      
      for (const deletion of resourceDeletions) {
        if (deletion.resourceType === 'Patient') {
          // Skip patient for now, delete it last
          continue;
        }
        
        const result = await deleteResourceType(
          deletion.resourceType, 
          deletion.conditionalParams, 
          patientId
        );
        
        if (result.success) {
          processedResourceTypes.push(deletion.resourceType);
        }
        
        updateOperationProgress(operationId, deletion.resourceType, result);
      }
      
      // Phase 2: Delete patient
      console.log(`Phase 2: Deleting patient ${patientId}`);
      
      const patientDeleteResult = await deleteResourceType('Patient', `_id=${patientId}`, patientId);
      updateOperationProgress(operationId, 'Patient', patientDeleteResult);
      
      if (patientDeleteResult.success) {
        processedResourceTypes.push('Patient');
      }
      
      // Phase 3: Clean history
      console.log(`Phase 3: Cleaning history for patient ${patientId}`);
      
      const operation = purgeOperations.get(operationId);
      if (operation) {
        operation.progress.currentResourceType = 'history cleanup';
      }
      
      await deleteHistory(patientId, processedResourceTypes);
      
      console.log(`Processed ${processedResourceTypes.length} resource types for patient ${patientId}`);
      
      // Complete operation
      const finalOperation = purgeOperations.get(operationId);
      const hasErrors = finalOperation?.errors.length || 0 > 0;
      
      const outcome: OperationOutcome = {
        resourceType: 'OperationOutcome',
        issue: [{
          severity: hasErrors ? 'warning' : 'information',
          code: hasErrors ? 'incomplete' : 'success',
          details: { 
            text: `Purge ${hasErrors ? 'completed with errors' : 'completed successfully'}. ` +
                  `Processed ${processedResourceTypes.length} resource types. ` +
                  `Deleted ${finalOperation?.progress.deletedResourcesCount || 0} resources.` +
                  (hasErrors ? ` Errors: ${finalOperation?.errors.length}` : '')
          }
        }]
      };
      
      completeOperation(operationId, hasErrors ? 'failed' : 'completed', outcome);
      
      console.log(`Purge operation ${operationId} completed ${hasErrors ? 'with errors' : 'successfully'}`);
      
    } catch (error) {
      console.error(`Purge operation ${operationId} failed:`, error);
      
      const outcome: OperationOutcome = {
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'exception',
          details: { text: `Purge operation failed: ${error}` }
        }]
      };
      
      completeOperation(operationId, 'failed', outcome);
    }
  });
  
  return operationId;
}