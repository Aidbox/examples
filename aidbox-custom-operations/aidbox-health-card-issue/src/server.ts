import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { loadConfig } from './types/config';
import { HealthCardsHandler } from './handlers/health-cards';
import { JWKSHandler } from './handlers/jwks';
import { JWKSService } from './services/jwks';

const app = express();
const config = loadConfig();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// Initialize services
const healthCardsHandler = new HealthCardsHandler(config);
const jwksService = new JWKSService({
  keyId: config.jwks.keyId,
  publicKeyPath: config.jwks.publicKeyPath,
  issuer: config.healthCards.issuer,
});
const jwksHandler = new JWKSHandler(jwksService);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'aidbox-health-card-issue',
    version: '1.0.0'
  });
});

// Main operation endpoint - matches Aidbox App configuration
app.post('/health-cards-issue', (req: Request, res: Response) => {
  const operationId = req.body.operation.id;
  switch (operationId) {
    case 'health-cards-issue':
      healthCardsHandler.handleHealthCardsIssue(req, res);
      break;
    case 'well-known-jwks':
      jwksHandler.handleWellKnownJWKS(req, res);
      break;
    default:
      res.status(400).json({
        error: 'Bad request',
        message: `Unsupported operation: ${operationId}`
      });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);

  res.status(500).json({
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'error',
      code: 'exception',
      details: { text: 'Internal server error' }
    }]
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    resourceType: 'OperationOutcome',
    issue: [{
      severity: 'error',
      code: 'not-found',
      details: { text: `Endpoint not found: ${req.method} ${req.path}` }
    }]
  });
});

// Initialize services and start server
const PORT = config.server.port;

async function startServer() {
  try {
    // Initialize JWKS service
    await jwksService.initialize();
    console.log('JWKS service initialized successfully');

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Health Cards service started on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Operation endpoint: http://localhost:${PORT}/health-cards-issue`);
      console.log(`JWKS endpoint: http://localhost:${PORT}/.well-known/jwks.json`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app;
