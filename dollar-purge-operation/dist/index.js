"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const purgeHandler_1 = require("./purgeHandler");
const app = (0, express_1.default)();
const PORT = 3000;
app.use(express_1.default.json());
app.get('/purge-status/:operationId', (req, res) => {
    const { operationId } = req.params;
    const operation = (0, purgeHandler_1.getOperation)(operationId);
    if (!operation) {
        res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'error',
                    code: 'not-found',
                    details: { text: `Purge operation ${operationId} not found` }
                }]
        });
        return;
    }
    const response = {
        resourceType: 'OperationOutcome',
        issue: [{
                severity: 'information',
                code: 'informational',
                details: {
                    text: `Purge operation ${operationId} is ${operation.status}. ` +
                        `Processed ${operation.progress.processedResourceTypes}/${operation.progress.totalResourceTypes} resource types. ` +
                        `Deleted ${operation.progress.deletedResourcesCount} resources.` +
                        (operation.progress.currentResourceType ? ` Currently processing: ${operation.progress.currentResourceType}` : '') +
                        (operation.errors.length > 0 ? ` Errors: ${operation.errors.length}` : '')
                }
            }],
        extension: [
            {
                url: 'http://hl7.org/fhir/StructureDefinition/operationdefinition-profile',
                valueString: JSON.stringify({
                    id: operationId,
                    patientId: operation.patientId,
                    status: operation.status,
                    startedAt: operation.startedAt,
                    completedAt: operation.completedAt,
                    progress: operation.progress,
                    errors: operation.errors
                })
            }
        ]
    };
    res.json(response);
});
app.get('/purge-operations', (_req, res) => {
    const operations = (0, purgeHandler_1.getAllOperations)();
    res.json({
        operations: operations.map(op => ({
            id: op.id,
            patientId: op.patientId,
            status: op.status,
            startedAt: op.startedAt,
            completedAt: op.completedAt,
            progress: op.progress,
            errorCount: op.errors.length
        }))
    });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.post('/', async (req, res) => {
    console.log('Received request from Aidbox:');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    const body = req.body;
    const operationId = body?.operation?.id;
    console.log(`Operation ID: ${operationId}`);
    if (!operationId) {
        res.status(400).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'error',
                    code: 'invalid',
                    details: { text: 'Operation ID is required in request body' }
                }]
        });
        return;
    }
    switch (operationId) {
        case 'purge':
            await handlePurgeOperation(req, res);
            break;
        case 'purge-status':
            handlePurgeStatusOperation(req, res);
            break;
        default:
            res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                        severity: 'error',
                        code: 'not-supported',
                        details: { text: `Operation '${operationId}' is not supported` }
                    }]
            });
    }
});
async function handlePurgeOperation(req, res) {
    let patientId;
    const body = req.body;
    if (body && body.request && body.request['route-params'] && body.request['route-params'].id) {
        patientId = body.request['route-params'].id;
    }
    else if (body && body['route-params'] && body['route-params'].id) {
        patientId = body['route-params'].id;
    }
    else {
        patientId = body?.id || req.query?.id || req.params?.id;
    }
    console.log(`Extracted patient ID: ${patientId}`);
    if (!patientId || patientId.trim() === '') {
        res.status(400).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'error',
                    code: 'invalid',
                    details: { text: 'Patient ID is required. Received request details logged to console.' }
                }]
        });
        return;
    }
    try {
        const operationId = await (0, purgeHandler_1.processPurge)(patientId);
        res.status(202).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'information',
                    code: 'informational',
                    details: { text: `Purge operation started with ID: ${operationId}. Check status at /fhir/purge-status/${operationId}` }
                }]
        });
    }
    catch (error) {
        console.error('Failed to start purge operation:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'error',
                    code: 'exception',
                    details: { text: `Failed to start purge operation: ${error}` }
                }]
        });
    }
}
function handlePurgeStatusOperation(req, res) {
    let operationId;
    const body = req.body;
    if (body && body.request && body.request['route-params'] && body.request['route-params'].operationId) {
        operationId = body.request['route-params'].operationId;
    }
    else if (body && body['route-params'] && body['route-params'].operationId) {
        operationId = body['route-params'].operationId;
    }
    else {
        operationId = req.query?.operationId || req.params?.operationId;
    }
    console.log(`Extracted operation ID: ${operationId}`);
    if (!operationId) {
        res.status(400).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'error',
                    code: 'invalid',
                    details: { text: 'Operation ID is required' }
                }]
        });
        return;
    }
    const operation = (0, purgeHandler_1.getOperation)(operationId);
    if (!operation) {
        res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'error',
                    code: 'not-found',
                    details: { text: `Purge operation ${operationId} not found` }
                }]
        });
        return;
    }
    const response = {
        resourceType: 'OperationOutcome',
        issue: [{
                severity: 'information',
                code: 'informational',
                details: {
                    text: `Purge operation ${operationId} is ${operation.status}. ` +
                        `Processed ${operation.progress.processedResourceTypes}/${operation.progress.totalResourceTypes} resource types. ` +
                        `Deleted ${operation.progress.deletedResourcesCount} resources.` +
                        (operation.progress.currentResourceType ? ` Currently processing: ${operation.progress.currentResourceType}` : '') +
                        (operation.errors.length > 0 ? ` Errors: ${operation.errors.length}` : '')
                }
            }],
        extension: [
            {
                url: 'http://hl7.org/fhir/StructureDefinition/operationdefinition-profile',
                valueString: JSON.stringify({
                    id: operationId,
                    patientId: operation.patientId,
                    status: operation.status,
                    startedAt: operation.startedAt,
                    completedAt: operation.completedAt,
                    progress: operation.progress,
                    errors: operation.errors
                })
            }
        ]
    };
    res.json(response);
}
app.listen(PORT, () => {
    console.log(`Purge service listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Operations list: http://localhost:${PORT}/purge-operations`);
});
