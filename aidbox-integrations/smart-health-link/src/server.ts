import { loadConfig } from './types/config.ts';
import type { AidboxOperationRequest } from './types/operation.ts';
import { FhirClient } from './services/fhir-client.ts';
import { SHLinkStore } from './services/shlink-store.ts';
import { EligibilityService } from './services/eligibility.ts';
import { ShlService } from './services/shl-service.ts';
import { EligibilityWorkflow } from './services/eligibility-workflow.ts';
import { ShlHandler } from './handlers/shl.ts';

const config = loadConfig();

// Wire up dependencies.
// ShlService is the generic SHL protocol engine (would be built into Aidbox).
// EligibilityWorkflow is the use-case-specific App layer that drives the async job
// and feeds finished content back to the engine via attachContent().
const fhir = new FhirClient(config);
const shlService = new ShlService(config, { store: new SHLinkStore(fhir) });
const workflow = new EligibilityWorkflow(config, shlService, new EligibilityService(fhir));
const handler = new ShlHandler(shlService, workflow);

// The browser-based SHL viewer (paste a shlink:, decrypt client-side).
const viewerHtml = await Bun.file(new URL('./viewer.html', import.meta.url)).text();

/**
 * Aidbox routes every configured App operation to this single endpoint and
 * dispatches by `operation.id`. We mirror that pattern here.
 */
async function dispatch(op: AidboxOperationRequest): Promise<Response> {
  switch (op.operation.id) {
    case 'shl-kickoff':
      return handler.handleKickoff(op);
    case 'shl-manifest':
      return handler.handleManifest(op);
    case 'shl-file':
      return handler.handleFile(op);
    default:
      return new Response(
        JSON.stringify({ error: `Unsupported operation: ${op.operation.id}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
  }
}

const server = Bun.serve({
  port: config.server.port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        service: 'aidbox-smart-health-link',
        timestamp: new Date().toISOString(),
      });
    }

    // SHL viewer page.
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/viewer')) {
      return new Response(viewerHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Demo-only kickoff for the viewer UI. In production the kickoff is an
    // authenticated, back-office trigger (the `shl-kickoff` Aidbox operation);
    // here the app exposes an unauthenticated convenience route so the demo page
    // can start a check without putting Aidbox credentials in the browser.
    if (req.method === 'POST' && url.pathname === '/demo/kickoff') {
      let body: {
        memberName?: string;
        payerName?: string;
        memberId?: string;
        passcode?: string;
      };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      if (!body.memberName || !body.payerName) {
        return Response.json(
          { error: 'memberName and payerName are required' },
          { status: 400 }
        );
      }
      try {
        const result = await workflow.kickOff({
          memberName: body.memberName,
          payerName: body.payerName,
          memberId: body.memberId ?? 'unknown',
          passcode: body.passcode,
        });
        return Response.json({
          shlinkId: result.shlinkId,
          shlink: result.shlink,
          manifestUrl: result.payload.url,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Demo kickoff error:', err);
        return Response.json({ error: 'Kickoff failed' }, { status: 500 });
      }
    }

    // All Aidbox App operations arrive as POST to /shl-app with the operation envelope.
    if (req.method === 'POST' && url.pathname === '/shl-app') {
      let op: AidboxOperationRequest;
      try {
        op = (await req.json()) as AidboxOperationRequest;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      try {
        return await dispatch(op);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Operation error:', err);
        return new Response(
          JSON.stringify({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'exception', details: { text: 'Internal error' } }],
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'not-found', details: { text: 'Not found' } }],
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  },
});

// eslint-disable-next-line no-console
console.log(`SMART Health Link service listening on port ${server.port}`);
