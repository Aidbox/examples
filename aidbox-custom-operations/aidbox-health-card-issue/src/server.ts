import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './types/config';
import { HealthCardsHandler } from './handlers/health-cards';
import { JWKSHandler } from './handlers/jwks';
import { JWKSService } from './services/jwks';
import { HealthCardService, NoResourcesError } from './services/health-card';
import { toQrNumeric, toFileBody } from './utils/shc-encode';

const app = express();
const config = loadConfig();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Services (shared across the Aidbox operation, the demo route, and download).
const healthCardService = new HealthCardService(config);
const healthCardsHandler = new HealthCardsHandler(healthCardService);
const jwksService = new JWKSService({
  keyId: config.jwks.keyId,
  publicKeyPath: config.jwks.publicKeyPath,
  issuer: config.healthCards.issuer,
});
const jwksHandler = new JWKSHandler(jwksService);

// The viewer is served directly by the app (like the SHL example). Read from
// the source tree so it works both under nodemon (cwd = project root) and in the
// built container (cwd = /app; tsc does not copy .html into dist/).
const VIEWER_PATH = path.join(process.cwd(), 'src', 'viewer.html');

const DEFAULT_PATIENT_ID = 'example-patient';
const DEFAULT_CREDENTIAL_TYPE = 'https://smarthealth.cards#covid19';

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'aidbox-health-card-issue',
    version: '1.0.0',
  });
});

// SHC issuer JWKS. Also published (canonically) through Aidbox at
// <iss>/.well-known/jwks.json via the namespaced App op; this same-origin route
// (CORS-enabled) is what the in-browser verifier fetches.
app.get('/.well-known/jwks.json', (req: Request, res: Response) => {
  jwksHandler.handleWellKnownJWKS(req, res);
});

// Demo viewer (Issue + Verify).
app.get('/', (_req: Request, res: Response) => {
  res.type('html').send(fs.readFileSync(VIEWER_PATH, 'utf8'));
});

// Patient list for the viewer's dropdown.
app.get('/demo/patients', async (_req: Request, res: Response) => {
  try {
    const patients = await healthCardService.listPatients();
    res.json(patients.length ? patients : [{ id: DEFAULT_PATIENT_ID, label: DEFAULT_PATIENT_ID }]);
  } catch {
    res.json([{ id: DEFAULT_PATIENT_ID, label: DEFAULT_PATIENT_ID }]);
  }
});

// Unauthenticated demo trigger used by the viewer's Issue tab. In production the
// real entry point is the authenticated $health-cards-issue operation.
app.post('/demo/issue', async (req: Request, res: Response) => {
  try {
    const patientId = req.body.patientId || DEFAULT_PATIENT_ID;
    const credentialType = req.body.credentialType || DEFAULT_CREDENTIAL_TYPE;
    const since = req.body.since || undefined;
    const credentialTypes = Array.isArray(credentialType)
      ? credentialType
      : [credentialType];
    const credentialValueSet = Array.isArray(req.body.credentialValueSet)
      ? req.body.credentialValueSet.filter(Boolean)
      : req.body.credentialValueSet
        ? [req.body.credentialValueSet]
        : undefined;
    const identityClaims = Array.isArray(req.body.includeIdentityClaim)
      ? req.body.includeIdentityClaim.filter(Boolean)
      : undefined;

    const { jws, resourceLinks } = await healthCardService.issueForPatient(patientId, credentialTypes, {
      includeIdentityClaim: identityClaims && identityClaims.length ? identityClaims : true,
      since,
      credentialValueSet,
    });

    res.json({
      verifiableCredential: jws,
      qr: toQrNumeric(jws),
      downloadUrl: `/download?patientId=${encodeURIComponent(patientId)}&credentialType=${encodeURIComponent(String(credentialType))}`,
      issuer: config.healthCards.issuer,
      resourceLinks,
    });
  } catch (error) {
    if (error instanceof NoResourcesError) {
      res.status(404).json({ error: error.message });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('demo/issue error:', error);
    res.status(500).json({ error: 'Failed to issue health card' });
  }
});

// SMART Health Card file download (application/smart-health-card).
app.get('/download', async (req: Request, res: Response) => {
  try {
    const patientId = String(req.query.patientId || DEFAULT_PATIENT_ID);
    const credentialType = String(req.query.credentialType || DEFAULT_CREDENTIAL_TYPE);

    const { jws } = await healthCardService.issueForPatient(patientId, [credentialType], {
      includeIdentityClaim: true,
    });

    res.setHeader('Content-Type', 'application/smart-health-card');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="covid19.smart-health-card"'
    );
    res.status(200).send(JSON.stringify(toFileBody(jws)));
  } catch (error) {
    if (error instanceof NoResourcesError) {
      res.status(404).json({ error: error.message });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('download error:', error);
    res.status(500).json({ error: 'Failed to build health card file' });
  }
});

// Aidbox App operation dispatch (matches init-bundle App endpoint).
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
        message: `Unsupported operation: ${operationId}`,
      });
  }
});

// Error handling middleware
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', error);
  res.status(500).json({
    resourceType: 'OperationOutcome',
    issue: [{ severity: 'error', code: 'exception', details: { text: 'Internal server error' } }],
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity: 'error',
        code: 'not-found',
        details: { text: `Endpoint not found: ${req.method} ${req.path}` },
      },
    ],
  });
});

const PORT = config.server.port;

async function startServer(): Promise<void> {
  try {
    await jwksService.initialize();
    // eslint-disable-next-line no-console
    console.log('JWKS service initialized successfully');

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Health Cards service started on port ${PORT}`);
      // eslint-disable-next-line no-console
      console.log(`Viewer:  http://localhost:${PORT}/`);
      // eslint-disable-next-line no-console
      console.log(`JWKS:    http://localhost:${PORT}/.well-known/jwks.json`);
      // eslint-disable-next-line no-console
      console.log(`Issuer:  ${config.healthCards.issuer}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
