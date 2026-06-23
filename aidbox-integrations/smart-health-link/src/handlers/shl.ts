import type { AidboxOperationRequest, ManifestRequestBody } from '../types/operation.ts';
import type { ShlService } from '../services/shl-service.ts';
import type { EligibilityWorkflow } from '../services/eligibility-workflow.ts';

/** JSON Response helper. */
function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function operationOutcome(severity: string, code: string, text: string, status: number): Response {
  return json(
    { resourceType: 'OperationOutcome', issue: [{ severity, code, details: { text } }] },
    status
  );
}

/**
 * Handles the three Aidbox App operations behind the SMART Health Links flow.
 * Each method maps one `operation.id` configured in the init bundle.
 */
export class ShlHandler {
  constructor(
    private readonly shl: ShlService,
    private readonly workflow: EligibilityWorkflow
  ) {}

  /** operation `shl-kickoff`: start an RTE job and mint a shlink: (App-layer use case). */
  async handleKickoff(op: AidboxOperationRequest): Promise<Response> {
    const params = extractParameters(op.request.resource);
    const memberName = params.memberName;
    const payerName = params.payerName;
    const memberId = params.memberId;

    if (!memberName || !payerName) {
      return operationOutcome(
        'error',
        'invalid',
        'memberName and payerName parameters are required',
        400
      );
    }

    const result = await this.workflow.kickOff({
      memberName,
      payerName,
      memberId: memberId ?? 'unknown',
      passcode: params.passcode,
    });

    return json({
      resourceType: 'Parameters',
      parameter: [
        { name: 'shlinkId', valueString: result.shlinkId },
        { name: 'shlink', valueString: result.shlink },
        { name: 'manifestUrl', valueString: result.payload.url },
      ],
    });
  }

  /** operation `shl-manifest`: the SHL receiver POSTs the manifest URL. */
  async handleManifest(op: AidboxOperationRequest): Promise<Response> {
    const shlinkId = op.request['route-params'].shlId;
    if (!shlinkId) {
      return operationOutcome('error', 'invalid', 'Missing shlId', 400);
    }

    const body = (op.request.resource ?? {}) as ManifestRequestBody;
    if (!body.recipient) {
      return operationOutcome('error', 'invalid', 'recipient is required', 400);
    }

    const result = await this.shl.getManifest(shlinkId, {
      embeddedLengthMax: body.embeddedLengthMax,
      passcode: body.passcode,
    });

    switch (result.kind) {
      case 'ok':
        return json(result.manifest);
      case 'not-found':
        return operationOutcome('error', 'not-found', 'Unknown SMART Health Link', 404);
      case 'passcode-required':
        // Spec: a passcode is required to resolve this link.
        return json({ message: 'Passcode required' }, 401);
      case 'passcode-invalid':
        // Spec: reject and report remaining lifetime attempts.
        return json({ remainingAttempts: result.remainingAttempts }, 401);
      case 'rate-limited':
        return json({ message: 'Too many requests' }, 429, {
          'Retry-After': String(result.retryAfterSeconds),
        });
    }
  }

  /** operation `shl-file`: the receiver GETs a short-lived file location. */
  async handleFile(op: AidboxOperationRequest): Promise<Response> {
    const token = op.request['route-params'].fileId;
    if (!token) {
      return operationOutcome('error', 'invalid', 'Missing file token', 400);
    }

    const result = await this.shl.getFile(token);
    switch (result.kind) {
      case 'ok':
        // Per spec, file locations return the JWE with content-type application/jose.
        return new Response(result.jwe, {
          status: 200,
          headers: { 'Content-Type': 'application/jose' },
        });
      case 'gone':
        // The short-lived location URL has expired.
        return operationOutcome('error', 'expired', 'File link has expired', 410);
      case 'not-found':
        return operationOutcome('error', 'not-found', 'File not available', 404);
    }
  }
}

/** Pull simple string params out of a FHIR Parameters resource. */
function extractParameters(resource: unknown): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  const params = (resource as { parameter?: Array<{ name: string; valueString?: string }> })
    ?.parameter;
  if (Array.isArray(params)) {
    for (const p of params) {
      if (p.valueString !== undefined) out[p.name] = p.valueString;
    }
  }
  return out;
}
