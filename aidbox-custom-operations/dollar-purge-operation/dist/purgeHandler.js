"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperation = getOperation;
exports.getAllOperations = getAllOperations;
exports.processPurge = processPurge;
const resourceDeletions_1 = require("./resourceDeletions");
const AIDBOX_URL = 'http://localhost:8888';
const AIDBOX_AUTH = Buffer.from('basic:secret').toString('base64');
const purgeOperations = new Map();
function generateOperationId() {
    return `purge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function createOperation(patientId) {
    const operationId = generateOperationId();
    const operation = {
        id: operationId,
        patientId,
        status: 'in-progress',
        startedAt: new Date(),
        progress: {
            totalResourceTypes: resourceDeletions_1.RESOURCE_DELETIONS.length,
            processedResourceTypes: 0,
            deletedResourcesCount: 0
        },
        errors: [],
        deletedResources: []
    };
    purgeOperations.set(operationId, operation);
    return operationId;
}
function updateOperationProgress(operationId, currentResourceType, result) {
    const operation = purgeOperations.get(operationId);
    if (!operation)
        return;
    operation.progress.currentResourceType = currentResourceType;
    operation.progress.processedResourceTypes++;
    if (result.success && result.count) {
        operation.progress.deletedResourcesCount += result.count;
        if (result.deletedIds) {
            result.deletedIds.forEach(id => {
                operation.deletedResources.push({
                    resourceType: currentResourceType,
                    id: id
                });
            });
        }
    }
    if (!result.success && result.error) {
        operation.errors.push(`${currentResourceType}: ${result.error}`);
    }
}
function completeOperation(operationId, status, outcome) {
    const operation = purgeOperations.get(operationId);
    if (!operation)
        return;
    operation.status = status;
    operation.completedAt = new Date();
    operation.progress.currentResourceType = undefined;
    operation.outcome = outcome;
}
function getOperation(operationId) {
    return purgeOperations.get(operationId);
}
function getAllOperations() {
    return Array.from(purgeOperations.values());
}
async function withRetry(operation, maxRetries = 3, backoffMs = 1000) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (error instanceof Error && error.message.includes('401') || error instanceof Error && error.message.includes('403')) {
                throw error;
            }
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
            }
        }
    }
    throw lastError;
}
async function deleteResourceType(resourceType, conditionalParams, patientId) {
    try {
        const searchUrl = `${AIDBOX_URL}/${resourceType}?${conditionalParams}`;
        console.log(`Searching for ${resourceType} resources: ${searchUrl}`);
        const searchResponse = await withRetry(() => fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${AIDBOX_AUTH}`,
                'Content-Type': 'application/json'
            }
        }));
        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status} ${await searchResponse.text()}`);
        }
        const bundle = await searchResponse.json();
        const resources = bundle.entry || [];
        const resourceIds = resources.map(entry => entry.resource.id);
        if (resources.length === 0) {
            console.log(`No ${resourceType} resources found for patient ${patientId}`);
            return { success: true, method: 'conditional', count: 0, deletedIds: [] };
        }
        console.log(`Found ${resources.length} ${resourceType} resources to delete`);
        const deleteUrl = `${AIDBOX_URL}/${resourceType}?${conditionalParams}`;
        console.log(`Attempting conditional DELETE: ${deleteUrl}`);
        const deleteResponse = await withRetry(() => fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${AIDBOX_AUTH}`,
                'Content-Type': 'application/json'
            }
        }));
        if (deleteResponse.ok) {
            console.log(`Conditional DELETE succeeded for ${resourceType}`);
            return {
                success: true,
                method: 'conditional',
                count: resourceIds.length,
                deletedIds: resourceIds
            };
        }
        console.log(`Conditional DELETE failed for ${resourceType} (${deleteResponse.status}), trying fallback`);
        console.log(`Deleting ${resources.length} ${resourceType} resources individually`);
        const deletePromises = resources.map((entry, index) => withRetry(() => fetch(`${AIDBOX_URL}/${resourceType}/${entry.resource.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${AIDBOX_AUTH}`,
                'Content-Type': 'application/json'
            }
        })).then(response => ({
            success: response.ok,
            id: resourceIds[index]
        })));
        const deleteResults = await Promise.allSettled(deletePromises);
        const successfulDeletes = deleteResults
            .filter(result => result.status === 'fulfilled' && result.value.success)
            .map(result => result.value.id);
        if (successfulDeletes.length === resources.length) {
            return {
                success: true,
                method: 'individual',
                count: successfulDeletes.length,
                deletedIds: successfulDeletes
            };
        }
        else {
            const failedCount = resources.length - successfulDeletes.length;
            return {
                success: false,
                method: 'individual',
                count: successfulDeletes.length,
                deletedIds: successfulDeletes,
                error: `${failedCount}/${resources.length} individual deletes failed`
            };
        }
    }
    catch (error) {
        console.error(`Failed to delete ${resourceType}:`, error);
        return {
            success: false,
            method: 'conditional',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
async function deleteHistory(patientId, processedResourceTypes) {
    console.log(`Starting history cleanup for patient ${patientId}, processed ${processedResourceTypes.length} resource types`);
    const queries = (0, resourceDeletions_1.getHistoryCleanupQueries)(patientId, processedResourceTypes);
    for (const query of queries) {
        try {
            console.log(`Executing history cleanup query: ${query.substring(0, 100)}...`);
            await withRetry(() => fetch(`${AIDBOX_URL}/$sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${AIDBOX_AUTH}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: query.trim() })
            }));
        }
        catch (error) {
            console.error(`Failed to execute history cleanup query:`, error);
        }
    }
    console.log(`History cleanup completed for patient ${patientId}`);
}
async function processPurge(patientId) {
    const operationId = createOperation(patientId);
    console.log(`Starting purge operation ${operationId} for patient ${patientId}`);
    setImmediate(async () => {
        const deletedResourceTypes = [];
        console.log(`Starting purge operation for patient ${patientId}`);
        try {
            console.log(`Phase 1: Deleting current resources for patient ${patientId}`);
            const resourceDeletions = (0, resourceDeletions_1.getResourceDeletionsForPatient)(patientId);
            for (const deletion of resourceDeletions) {
                if (deletion.resourceType === 'Patient') {
                    continue;
                }
                const result = await deleteResourceType(deletion.resourceType, deletion.conditionalParams, patientId);
                if (result.success && result.count && result.count > 0) {
                    deletedResourceTypes.push(deletion.resourceType);
                }
                updateOperationProgress(operationId, deletion.resourceType, result);
            }
            console.log(`Phase 2: Deleting patient ${patientId}`);
            const patientDeleteResult = await deleteResourceType('Patient', `_id=${patientId}`, patientId);
            updateOperationProgress(operationId, 'Patient', patientDeleteResult);
            if (patientDeleteResult.success && patientDeleteResult.count && patientDeleteResult.count > 0) {
                deletedResourceTypes.push('Patient');
            }
            console.log(`Phase 3: Cleaning history for patient ${patientId}`);
            const operation = purgeOperations.get(operationId);
            if (operation) {
                operation.progress.currentResourceType = 'history cleanup';
            }
            if (deletedResourceTypes.length > 0) {
                await deleteHistory(patientId, deletedResourceTypes);
            }
            else {
                console.log(`No resources were deleted, skipping history cleanup`);
            }
            console.log(`Deleted resources from ${deletedResourceTypes.length} resource types for patient ${patientId}`);
            const finalOperation = purgeOperations.get(operationId);
            const hasErrors = finalOperation?.errors.length || 0 > 0;
            const outcome = {
                resourceType: 'OperationOutcome',
                issue: [{
                        severity: hasErrors ? 'warning' : 'information',
                        code: hasErrors ? 'incomplete' : 'success',
                        details: {
                            text: `Purge ${hasErrors ? 'completed with errors' : 'completed successfully'}. ` +
                                `Processed ${resourceDeletions_1.RESOURCE_DELETIONS.length} resource types. ` +
                                `Deleted ${finalOperation?.progress.deletedResourcesCount || 0} resources.` +
                                (hasErrors ? ` Errors: ${finalOperation?.errors.length}` : '')
                        }
                    }]
            };
            completeOperation(operationId, hasErrors ? 'failed' : 'completed', outcome);
            console.log(`Purge operation ${operationId} completed ${hasErrors ? 'with errors' : 'successfully'}`);
        }
        catch (error) {
            console.error(`Purge operation ${operationId} failed:`, error);
            const outcome = {
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
