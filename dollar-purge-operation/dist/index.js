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
app.post('/purge/:patientId', async (req, res) => {
    const { patientId } = req.params;
    console.log(`Received $purge request for patient: ${patientId}`);
    if (!patientId || patientId.trim() === '') {
        res.status(400).json({
            resourceType: 'OperationOutcome',
            issue: [{
                    severity: 'error',
                    code: 'invalid',
                    details: { text: 'Patient ID is required' }
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
                    details: { text: `Purge operation started with ID: ${operationId}. Check status at /purge-status/${operationId}` }
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
});
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
app.post('/purge', async (req, res) => {
    console.log('Received purge request from Aidbox:');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('Params:', req.params);
    let patientId = req.body?.id || req.query?.id || req.params?.id;
    if (!patientId) {
        if (req.body && typeof req.body === 'object') {
            const body = req.body;
            patientId = body.patientId || body.patient || body.subject;
            if (typeof patientId === 'object' && patientId.reference) {
                patientId = patientId.reference.replace('Patient/', '');
            }
        }
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
                    details: { text: `Purge operation started with ID: ${operationId}. Check status at /purge-status/${operationId}` }
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
});
app.post('/test-purge/:patientId', async (req, res) => {
    const { patientId } = req.params;
    console.log(`Test purge request for patient: ${patientId}`);
    try {
        const operationId = await (0, purgeHandler_1.processPurge)(patientId);
        res.json({
            message: 'Purge operation started',
            operationId,
            statusUrl: `/purge-status/${operationId}`
        });
    }
    catch (error) {
        console.error('Test purge failed:', error);
        res.status(500).json({ error: error });
    }
});
app.listen(PORT, () => {
    console.log(`Purge service listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Operations list: http://localhost:${PORT}/purge-operations`);
});
