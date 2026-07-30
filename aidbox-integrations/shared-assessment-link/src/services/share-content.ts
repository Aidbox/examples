import type { AssessmentShareResource } from '../types/assessment-share-resource.ts';
import type { Bundle, QuestionnaireResponse } from '../types/fhir.ts';
import type { AssessmentService } from './assessment-service.ts';
import type { ContentProvider } from './share-service.ts';
import { redactResponse } from './redaction.ts';

/** URL of the extension describing the share window on the outgoing bundle. */
export const SHARE_WINDOW_EXTENSION =
  'http://example.org/fhir/StructureDefinition/share-window';
/** URL of the extension listing the items withheld from the outgoing bundle. */
export const SHARE_REDACTION_EXTENSION =
  'http://example.org/fhir/StructureDefinition/share-redaction';

/**
 * Builds what the recipient organization actually reads: a FHIR searchset Bundle
 * of the sharing organization's GAD-7 responses for the patient, with the
 * share's field policy applied.
 *
 * Called by the protocol engine on *every* manifest poll, which is what makes the
 * share live. Two properties follow from that:
 *
 *   - an assessment Provider A completes after minting the link is simply picked
 *     up by the next query — no re-mint, no notification plumbing;
 *   - if A tightens `hiddenItems` later, the change applies retroactively to the
 *     same link, because no unredacted copy was ever encrypted.
 *
 * The bundle is self-describing: it states the window it was produced under and
 * which items were withheld, so the receiving clinician can see the shape of what
 * they were and weren't given.
 */
export class ShareContentProvider implements ContentProvider {
  constructor(private readonly assessments: AssessmentService) {}

  async build(
    share: AssessmentShareResource
  ): Promise<{ bytes: string; responseCount: number }> {
    const responses = await this.assessments.listGad7({
      patient: share.patient,
      sourceOrganization: share.sourceOrganization,
      questionnaire: share.questionnaire,
    });

    const redactedLinkIds = new Set<string>();
    let scoreWithheld = false;

    const shared: QuestionnaireResponse[] = responses.map((response) => {
      const { resource, summary } = redactResponse(response, {
        hiddenItems: share.hiddenItems,
        shareScore: share.shareScore,
      });
      summary.redactedLinkIds.forEach((id) => redactedLinkIds.add(id));
      if (summary.scoreWithheld) scoreWithheld = true;
      return resource;
    });

    const bundle: Bundle<QuestionnaireResponse> & {
      extension: Array<Record<string, unknown>>;
    } = {
      resourceType: 'Bundle',
      type: 'searchset',
      timestamp: new Date().toISOString(),
      total: shared.length,
      // Tell the recipient the terms under which they're reading this, so the
      // constraints travel with the data rather than living only on our server.
      extension: [
        {
          url: SHARE_WINDOW_EXTENSION,
          extension: [
            { url: 'start', valueInstant: new Date(share.startsAt * 1000).toISOString() },
            { url: 'end', valueInstant: new Date(share.endsAt * 1000).toISOString() },
            { url: 'sharedBy', valueString: share.sourceOrganization },
            { url: 'sharedWith', valueString: share.recipientDisplay ?? share.recipientOrganization },
          ],
        },
        {
          url: SHARE_REDACTION_EXTENSION,
          extension: [
            ...[...redactedLinkIds].sort().map((id) => ({ url: 'withheldItem', valueString: id })),
            { url: 'scoreWithheld', valueBoolean: scoreWithheld },
          ],
        },
      ],
      // No `fullUrl`: FHIR requires it to be absolute, and the recipient has no
      // access to this server's FHIR base anyway — the id on each resource is
      // what identifies it. An absent optional field beats an invalid one.
      entry: shared.map((resource) => ({ resource })),
    };

    return { bytes: JSON.stringify(bundle), responseCount: shared.length };
  }
}
