import { loadConfig } from './types/config.ts';
import type { AidboxOperationRequest } from './types/operation.ts';
import { FhirClient } from './services/fhir-client.ts';
import { ShareStore } from './services/share-store.ts';
import {
  AssessmentService,
  gad7TotalOf,
  GAD7_SCORE_EXTENSION,
} from './services/assessment-service.ts';
import type { Gad7Answer } from './services/assessment-service.ts';
import { ShareContentProvider, SHARE_WINDOW_EXTENSION } from './services/share-content.ts';
import { REDACTED_EXTENSION } from './services/redaction.ts';
import { ShareService } from './services/share-service.ts';
import { ShareHandler, parseEpoch } from './handlers/share.ts';
import {
  GAD7_QUESTIONNAIRE_URL,
  GAD7_QUESTIONNAIRE_ID,
  GAD7_SCORED_LINK_IDS,
} from './types/gad7.ts';
import type { QuestionnaireResponseItem } from './types/fhir.ts';

const config = loadConfig();

/** The sharing organization this app acts as (Provider A). Seeded by the init bundle. */
const PROVIDER_A = config.share.sourceOrganization;

// Wire up dependencies.
//
// ShareService is the SHL protocol engine: it owns the link, the window and the
// security plumbing, and asks a ContentProvider for bytes on every poll.
// ShareContentProvider is the use-case layer: it queries live assessments and
// applies Provider A's field-level policy. The engine never sees an assessment.
const fhir = new FhirClient(config);
const assessments = new AssessmentService(fhir);
const store = new ShareStore(fhir);
const shares = new ShareService(config, {
  store,
  content: new ShareContentProvider(assessments),
});
const handler = new ShareHandler(shares, config);

// The browser UI: intake form, share builder, and the recipient's viewer.
const appHtml = await Bun.file(new URL('./app.html', import.meta.url)).text();

/**
 * Bundle the React intake form at boot.
 *
 * The GAD-7 form is rendered by @formbox/renderer, which needs a bundler (its
 * dist imports bare specifiers). Building here keeps the project's "no build
 * step to run" property: `bun src/server.ts` still starts everything. The rest
 * of the UI stays plain no-build HTML — only this island is compiled.
 */
async function buildIntakeBundle(): Promise<{ js: string; css: string }> {
  const result = await Bun.build({
    entrypoints: [new URL('./forms/intake.tsx', import.meta.url).pathname],
    target: 'browser',
    minify: true,
    define: { 'process.env.NODE_ENV': '"production"' },
  });

  if (!result.success) {
    throw new AggregateError(result.logs, 'Failed to bundle the intake form');
  }

  let js = '';
  let css = '';
  for (const output of result.outputs) {
    if (output.kind === 'entry-point' || output.path.endsWith('.js')) js += await output.text();
    else if (output.path.endsWith('.css')) css += await output.text();
  }
  return { js, css };
}

const intakeBundle = await buildIntakeBundle();

/**
 * Aidbox routes every configured App operation to this single endpoint and
 * dispatches by `operation.id`. We mirror that pattern here.
 */
async function dispatch(op: AidboxOperationRequest): Promise<Response> {
  switch (op.operation.id) {
    case 'share-create':
      return handler.handleCreate(op);
    case 'share-revoke':
      return handler.handleRevoke(op);
    case 'share-manifest':
      return handler.handleManifest(op);
    case 'share-file':
      return handler.handleFile(op);
    default:
      return new Response(
        JSON.stringify({ error: `Unsupported operation: ${op.operation.id}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const server = Bun.serve({
  port: config.server.port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/health') {
      return json({
        status: 'healthy',
        service: 'aidbox-shared-assessment-link',
        timestamp: new Date().toISOString(),
      });
    }

    // The demo UI (intake + share builder + recipient viewer).
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/app')) {
      return new Response(appHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // The bundled React intake form and the theme's stylesheet.
    if (req.method === 'GET' && url.pathname === '/assets/intake.js') {
      return new Response(intakeBundle.js, {
        headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
      });
    }
    if (req.method === 'GET' && url.pathname === '/assets/intake.css') {
      return new Response(intakeBundle.css, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' },
      });
    }

    // ---------------------------------------------------------------------
    // Demo-only routes.
    //
    // In production these are authenticated back-office actions inside Provider
    // A's system (the `share-create` / `share-revoke` Aidbox operations). Here
    // the app exposes unauthenticated convenience routes so the demo page can
    // drive the flow without putting Aidbox credentials in the browser.
    // ---------------------------------------------------------------------

    /**
     * Everything the React intake island needs: the Questionnaire *as stored in
     * Aidbox* (so the instrument is defined once, in FHIR), the terminology base
     * the renderer expands `answerValueSet`s against, and the patient list.
     */
    if (req.method === 'GET' && url.pathname === '/demo/intake-form') {
      const questionnaire = await fhir.read<Record<string, unknown>>(
        'Questionnaire',
        GAD7_QUESTIONNAIRE_ID
      );
      if (!questionnaire) {
        return json({ error: `Questionnaire/${GAD7_QUESTIONNAIRE_ID} not found in Aidbox` }, 404);
      }
      // No terminologyServerUrl: the GAD-7's items carry inline `answerOption`,
      // so the renderer needs no $expand round trip — which also means the
      // browser never needs credentials for Aidbox's terminology endpoints.
      return json({ questionnaire, patients: await listPatients() });
    }

    /**
     * The extension URLs the recipient viewer reads, so the wire contract is
     * defined once on the server rather than re-declared in the page.
     */
    if (req.method === 'GET' && url.pathname === '/demo/extensions') {
      return json({
        score: GAD7_SCORE_EXTENSION,
        masked: REDACTED_EXTENSION,
        window: SHARE_WINDOW_EXTENSION,
        // Which items feed the total — the share builder flags the rest, since
        // hiding an unscored item cannot move the score.
        scoredLinkIds: GAD7_SCORED_LINK_IDS,
      });
    }

    /** Provider A's patients. */
    if (req.method === 'GET' && url.pathname === '/demo/patients') {
      return json(await listPatients());
    }

    /** Submit a completed GAD-7 (Provider A captures an assessment). */
    if (req.method === 'POST' && url.pathname === '/demo/assessments') {
      let body: {
        patient?: string;
        /** Coded answers (API / seed path). */
        answers?: Gad7Answer[];
        /** A renderer-produced QuestionnaireResponse (the form path). */
        questionnaireResponse?: { item?: QuestionnaireResponseItem[] };
        authored?: string;
      };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }
      const items = body.questionnaireResponse?.item;
      if (!body.patient || (!items?.length && !body.answers?.length)) {
        return json(
          { error: 'patient plus either questionnaireResponse.item or answers is required' },
          400
        );
      }
      try {
        const created = await assessments.submitGad7({
          patient: body.patient,
          sourceOrganization: PROVIDER_A,
          ...(items?.length ? { items } : { answers: body.answers }),
          authored: body.authored,
        });
        return json({
          id: created.id,
          authored: created.authored,
          total: gad7TotalOf(created),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Assessment submit error:', err);
        // Surface the underlying reason: a FHIR validation rejection is a bug in
        // the resource we built, and "something went wrong" hides it.
        return json(
          { error: err instanceof Error ? err.message : 'Could not save the assessment' },
          500
        );
      }
    }

    /** Provider A's assessments for one patient (the sharing side's own view). */
    if (req.method === 'GET' && url.pathname === '/demo/assessments') {
      const patient = url.searchParams.get('patient');
      if (!patient) return json({ error: 'patient query parameter is required' }, 400);
      const responses = await assessments.listGad7({
        patient,
        sourceOrganization: PROVIDER_A,
      });
      return json(
        responses.map((r) => ({ id: r.id, authored: r.authored, total: gad7TotalOf(r) }))
      );
    }

    /** Create a share and mint the shlink: (Provider A grants access). */
    if (req.method === 'POST' && url.pathname === '/demo/shares') {
      let body: {
        patient?: string;
        patientName?: string;
        recipientOrganization?: string;
        recipientDisplay?: string;
        start?: string;
        end?: string;
        hiddenItems?: string[];
        shareScore?: boolean;
        passcode?: string;
      };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }
      if (!body.patient || !body.recipientOrganization) {
        return json({ error: 'patient and recipientOrganization are required' }, 400);
      }

      const startsAt = parseEpoch(body.start) ?? Math.floor(Date.now() / 1000);
      const endsAt =
        parseEpoch(body.end) ?? startsAt + config.share.defaultWindowDays * 86400;

      // createShare owns the window invariant; its message surfaces via the catch.
      try {
        const result = await shares.createShare({
          label: `GAD-7 assessments for ${body.patientName ?? body.patient}`,
          sourceOrganization: PROVIDER_A,
          recipientOrganization: body.recipientOrganization,
          recipientDisplay: body.recipientDisplay,
          patient: body.patient,
          questionnaire: GAD7_QUESTIONNAIRE_URL,
          startsAt,
          endsAt,
          hiddenItems: body.hiddenItems ?? [],
          shareScore: body.shareScore !== false,
          passcode: body.passcode,
        });
        return json({
          shareId: result.shareId,
          shlink: result.shlink,
          manifestUrl: result.payload.url,
          startsAt,
          endsAt,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Share create error:', err);
        return json(
          { error: err instanceof Error ? err.message : 'Could not create the share' },
          400
        );
      }
    }

    /** Provider A's dashboard: every share, its window, and who has read it. */
    if (req.method === 'GET' && url.pathname === '/demo/shares') {
      const all = await store.list();
      return json(
        all.map((s) => ({
          shareId: s.id,
          label: s.label,
          patient: s.patient,
          recipient: s.recipientDisplay ?? s.recipientOrganization,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          hiddenItems: s.hiddenItems ?? [],
          shareScore: s.shareScore !== false,
          hasPasscode: Boolean(s.passcode),
          status: s.status,
          revokedAt: s.revokedAt,
          state: shares.windowState(s),
          shlink: shares.buildShlinkUri(s),
          accessLog: s.accessLog ?? [],
        }))
      );
    }

    /** Revoke a share early (Provider A closes it before the end date). */
    const revokeMatch = url.pathname.match(/^\/demo\/shares\/([^/]+)\/revoke$/);
    if (req.method === 'POST' && revokeMatch) {
      const share = await shares.revokeShare(revokeMatch[1]!);
      if (!share) return json({ error: 'Unknown share' }, 404);
      return json({ shareId: share.id, status: share.status, revokedAt: share.revokedAt });
    }

    // All Aidbox App operations arrive as POST to /share-app with the operation envelope.
    if (req.method === 'POST' && url.pathname === '/share-app') {
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
            issue: [
              { severity: 'error', code: 'exception', details: { text: 'Internal error' } },
            ],
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

/** The patients this organization can record assessments against. */
async function listPatients(): Promise<
  Array<{ reference: string; name: string; birthDate?: string }>
> {
  const patients = await fhir.search<{
    id?: string;
    name?: Array<{ given?: string[]; family?: string }>;
    birthDate?: string;
  }>('Patient', [['_count', '20']]);
  return patients.map((p) => ({
    reference: `Patient/${p.id}`,
    name: formatName(p.name),
    birthDate: p.birthDate,
  }));
}

function formatName(
  name: Array<{ given?: string[]; family?: string }> | undefined
): string {
  const n = name?.[0];
  if (!n) return 'Unknown patient';
  return [n.given?.join(' '), n.family].filter(Boolean).join(' ') || 'Unknown patient';
}

// eslint-disable-next-line no-console
console.log(`Shared assessment link service listening on port ${server.port}`);
