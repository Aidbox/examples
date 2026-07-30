import type { AidboxOperationRequest, ManifestRequestBody } from '../types/operation.ts';
import type { ShareService } from '../services/share-service.ts';
import type { Config } from '../types/config.ts';
import { GAD7_QUESTIONNAIRE_URL } from '../types/gad7.ts';

/** JSON Response helper. */
function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function operationOutcome(
  severity: string,
  code: string,
  text: string,
  status: number
): Response {
  return json(
    { resourceType: 'OperationOutcome', issue: [{ severity, code, details: { text } }] },
    status
  );
}

/**
 * Handles the Aidbox App operations behind the assessment-sharing flow.
 * Each method maps one `operation.id` configured in the init bundle.
 */
export class ShareHandler {
  constructor(
    private readonly shares: ShareService,
    private readonly config: Config
  ) {}

  /**
   * operation `share-create`: Provider A grants Provider B time-bounded access.
   * Authenticated — only the sharing organization may create a grant.
   */
  async handleCreate(op: AidboxOperationRequest): Promise<Response> {
    const params = extractParameters(op.request.resource);

    const patient = params.patient;
    const recipientOrganization = params.recipientOrganization;
    if (!patient || !recipientOrganization) {
      return operationOutcome(
        'error',
        'invalid',
        'patient and recipientOrganization parameters are required',
        400
      );
    }

    const startsAt = parseEpoch(params.start) ?? Math.floor(Date.now() / 1000);
    const endsAt = parseEpoch(params.end);
    if (endsAt === undefined) {
      return operationOutcome(
        'error',
        'invalid',
        'end parameter is required (ISO date/dateTime or epoch seconds)',
        400
      );
    }
    // createShare owns the window invariant; its message surfaces via the catch.
    try {
      const result = await this.shares.createShare({
        label: params.label ?? `GAD-7 assessments (${patient})`,
        sourceOrganization: params.sourceOrganization ?? this.config.share.sourceOrganization,
        recipientOrganization,
        recipientDisplay: params.recipientDisplay,
        patient,
        questionnaire: params.questionnaire ?? GAD7_QUESTIONNAIRE_URL,
        startsAt,
        endsAt,
        // Comma-separated linkIds, e.g. "gad7-q4,gad7-q8".
        hiddenItems: splitList(params.hiddenItems),
        shareScore: params.shareScore !== 'false',
        passcode: params.passcode,
      });

      return json({
        resourceType: 'Parameters',
        parameter: [
          { name: 'shareId', valueString: result.shareId },
          { name: 'shlink', valueString: result.shlink },
          { name: 'manifestUrl', valueString: result.payload.url },
          { name: 'expiresAt', valueString: new Date(endsAt * 1000).toISOString() },
        ],
      });
    } catch (err) {
      return operationOutcome(
        'error',
        'invalid',
        err instanceof Error ? err.message : 'Could not create the share',
        400
      );
    }
  }

  /** operation `share-revoke`: Provider A closes a share before its end date. */
  async handleRevoke(op: AidboxOperationRequest): Promise<Response> {
    const shareId = op.request['route-params'].shareId;
    if (!shareId) {
      return operationOutcome('error', 'invalid', 'Missing shareId', 400);
    }

    const share = await this.shares.revokeShare(shareId);
    if (!share) {
      return operationOutcome('error', 'not-found', 'Unknown share', 404);
    }

    return json({
      resourceType: 'Parameters',
      parameter: [
        { name: 'shareId', valueString: share.id! },
        { name: 'status', valueString: share.status },
        {
          name: 'revokedAt',
          valueString: new Date((share.revokedAt ?? 0) * 1000).toISOString(),
        },
      ],
    });
  }

  /** operation `share-manifest`: the SHL receiver (Provider B) POSTs the manifest URL. */
  async handleManifest(op: AidboxOperationRequest): Promise<Response> {
    const shareId = op.request['route-params'].shareId;
    if (!shareId) {
      return operationOutcome('error', 'invalid', 'Missing shareId', 400);
    }

    const body = (op.request.resource ?? {}) as ManifestRequestBody;
    if (!body.recipient) {
      return operationOutcome('error', 'invalid', 'recipient is required', 400);
    }

    const result = await this.shares.getManifest(shareId, {
      embeddedLengthMax: body.embeddedLengthMax,
      passcode: body.passcode,
      recipient: body.recipient,
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

  /** operation `share-file`: the receiver GETs a short-lived file location. */
  async handleFile(op: AidboxOperationRequest): Promise<Response> {
    const token = op.request['route-params'].fileId;
    if (!token) {
      return operationOutcome('error', 'invalid', 'Missing file token', 400);
    }

    const result = await this.shares.getFile(token);
    switch (result.kind) {
      case 'ok':
        // Per spec, file locations return the JWE with content-type application/jose.
        return new Response(result.jwe, {
          status: 200,
          headers: { 'Content-Type': 'application/jose' },
        });
      case 'gone':
        // The location URL expired, or the share window closed under it.
        return operationOutcome('error', 'expired', 'This share link is no longer available', 410);
      case 'not-found':
        return operationOutcome('error', 'not-found', 'File not available', 404);
    }
  }
}

/** Pull simple string params out of a FHIR Parameters resource. */
function extractParameters(resource: unknown): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  const params = (
    resource as {
      parameter?: Array<{
        name: string;
        valueString?: string;
        valueBoolean?: boolean;
        valueDateTime?: string;
        valueDate?: string;
        valueInteger?: number;
      }>;
    }
  )?.parameter;
  if (Array.isArray(params)) {
    for (const p of params) {
      if (p.valueString !== undefined) out[p.name] = p.valueString;
      else if (p.valueDateTime !== undefined) out[p.name] = p.valueDateTime;
      else if (p.valueDate !== undefined) out[p.name] = p.valueDate;
      else if (p.valueBoolean !== undefined) out[p.name] = String(p.valueBoolean);
      else if (p.valueInteger !== undefined) out[p.name] = String(p.valueInteger);
    }
  }
  return out;
}

/** Accept either an ISO date/dateTime or raw epoch seconds for the window bounds. */
export function parseEpoch(value: string | undefined): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
