import express from 'express';
import { processPurge, getOperation, getAllOperations } from './purgeHandler';

const app = express();
const PORT = 3000;

app.use(express.json());

// Direct endpoint for checking purge status (for backward compatibility)
app.get('/purge-status/:operationId', (req, res) => {
  const { operationId } = req.params;
  const operation = getOperation(operationId);
  
  if (!operation) {
    res.status(404).json({
      error: 'not-found',
      message: `Purge operation ${operationId} not found`
    });
    return;
  }

  const response = {
    operationId: operationId,
    patientId: operation.patientId,
    status: operation.status,
    startedAt: operation.startedAt,
    completedAt: operation.completedAt,
    progress: operation.progress,
    errors: operation.errors,
    deletedResources: operation.deletedResources,
    summary: {
      message: `Purge operation ${operationId} is ${operation.status}`,
      totalResourceTypes: operation.progress.totalResourceTypes,
      processedResourceTypes: operation.progress.processedResourceTypes,
      totalDeleted: operation.progress.deletedResourcesCount,
      currentlyProcessing: operation.progress.currentResourceType || null,
      errorCount: operation.errors.length
    }
  };

  res.json(response);
});

// List all purge operations (for debugging)
app.get('/purge-operations', (_req, res) => {
  const operations = getAllOperations();
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

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Unified Aidbox integration endpoint - handles all operations from Aidbox App
app.post('/', async (req, res) => {
  console.log('Received request from Aidbox:');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  const body = req.body as any;
  const operationId = body?.operation?.id;
  
  console.log(`Operation ID: ${operationId}`);
  
  if (!operationId) {
    res.status(400).json({
      error: 'invalid-request',
      message: 'Operation ID is required in request body'
    });
    return;
  }

  // Route to appropriate handler based on operation ID
  switch (operationId) {
    case 'purge':
      await handlePurgeOperation(req, res);
      break;
    case 'purge-status':
      handlePurgeStatusOperation(req, res);
      break;
    default:
      res.status(400).json({
        error: 'not-supported',
        message: `Operation '${operationId}' is not supported`
      });
  }
});

// Handle $purge operation
async function handlePurgeOperation(req: any, res: any) {
  // Extract patient ID from Aidbox request structure
  let patientId;
  const body = req.body as any;
  
  if (body && body.request && body.request['route-params'] && body.request['route-params'].id) {
    patientId = body.request['route-params'].id;
  } else if (body && body['route-params'] && body['route-params'].id) {
    patientId = body['route-params'].id;
  } else {
    // Fallback to other possible locations
    patientId = body?.id || (req.query as any)?.id || (req.params as any)?.id;
  }
  
  console.log(`Extracted patient ID: ${patientId}`);
  
  if (!patientId || patientId.trim() === '') {
    res.status(400).json({
      error: 'invalid-request',
      message: 'Patient ID is required. Received request details logged to console.'
    });
    return;
  }

  try {
    const operationId = await processPurge(patientId);
    
    res.status(202).json({
      operationId: operationId,
      status: 'accepted',
      message: `Purge operation started with ID: ${operationId}`,
      statusUrl: `/fhir/purge-status/${operationId}`
    });
  } catch (error) {
    console.error('Failed to start purge operation:', error);
    res.status(500).json({
      error: 'internal-error',
      message: `Failed to start purge operation: ${error}`
    });
  }
}

// Handle $purge-status operation
function handlePurgeStatusOperation(req: any, res: any) {
  // Extract operation ID from Aidbox request structure
  let operationId;
  const body = req.body as any;
  
  if (body && body.request && body.request['route-params'] && body.request['route-params'].operationId) {
    operationId = body.request['route-params'].operationId;
  } else if (body && body['route-params'] && body['route-params'].operationId) {
    operationId = body['route-params'].operationId;
  } else {
    // Fallback to query params for direct calls
    operationId = (req.query as any)?.operationId || (req.params as any)?.operationId;
  }
  
  console.log(`Extracted operation ID: ${operationId}`);
  
  if (!operationId) {
    res.status(400).json({
      error: 'invalid-request',
      message: 'Operation ID is required'
    });
    return;
  }

  const operation = getOperation(operationId);
  
  if (!operation) {
    res.status(404).json({
      error: 'not-found',
      message: `Purge operation ${operationId} not found`
    });
    return;
  }

  const response = {
    operationId: operationId,
    patientId: operation.patientId,
    status: operation.status,
    startedAt: operation.startedAt,
    completedAt: operation.completedAt,
    progress: operation.progress,
    errors: operation.errors,
    deletedResources: operation.deletedResources,
    summary: {
      message: `Purge operation ${operationId} is ${operation.status}`,
      totalResourceTypes: operation.progress.totalResourceTypes,
      processedResourceTypes: operation.progress.processedResourceTypes,
      totalDeleted: operation.progress.deletedResourcesCount,
      currentlyProcessing: operation.progress.currentResourceType || null,
      errorCount: operation.errors.length
    }
  };

  res.json(response);
}


app.listen(PORT, () => {
  console.log(`Purge service listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Operations list: http://localhost:${PORT}/purge-operations`);
});