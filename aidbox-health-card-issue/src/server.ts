import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { loadConfig } from './types/config';
import { HealthCardsHandler } from './handlers/health-cards';
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

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'aidbox-health-card-issue',
    version: '1.0.0'
  });
});

// JWKS endpoint - SMART Health Cards compliance
app.get('/.well-known/jwks.json', (req: Request, res: Response) => {
  try {
    const jwks = jwksService.getJWKS();
    
    // Set CORS headers for cross-origin access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set caching headers (24 hours)
    res.header('Cache-Control', 'public, max-age=86400');
    res.header('Expires', new Date(Date.now() + 86400000).toUTCString());
    
    // Set content type
    res.header('Content-Type', 'application/json');
    
    res.status(200).json(jwks);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('JWKS endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate JWKS'
    });
  }
});

// Main operation endpoint - matches Aidbox App configuration
app.post('/health-cards-issue', (req: Request, res: Response) => {
  healthCardsHandler.handleHealthCardsIssue(req, res);
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