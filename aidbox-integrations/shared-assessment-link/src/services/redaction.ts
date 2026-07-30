import type { QuestionnaireResponse, QuestionnaireResponseItem } from '../types/fhir.ts';
import { GAD7_SCORED_LINK_IDS } from '../types/gad7.ts';
import { GAD7_SCORE_EXTENSION, computeGad7Total, gad7TotalOf } from './assessment-service.ts';

/**
 * URL of the extension that records *that* an item was withheld.
 *
 * Silently dropping an item is worse than saying it was dropped: the recipient
 * clinician cannot tell "the patient didn't answer" from "the sender wouldn't
 * show me". So redaction replaces each hidden item with a marker carrying the
 * item's linkId and text but no answer — the question stays visible, the
 * response does not.
 */
export const REDACTED_EXTENSION = 'http://example.org/fhir/StructureDefinition/data-absent-reason';

/** Value used for a withheld answer, mirroring FHIR's `masked` data-absent-reason. */
export const REDACTED_REASON = 'masked';

/** What a redaction pass actually removed, for the audit trail and the UI. */
export interface RedactionSummary {
  /** linkIds that were present in the source and got masked. */
  redactedLinkIds: string[];
  /** Whether the computed total score was withheld. */
  scoreWithheld: boolean;
}

/**
 * Apply a share's field-level policy to one QuestionnaireResponse.
 *
 * Two things happen, and the second is the subtle one:
 *
 *  1. Every item whose `linkId` is in `hiddenItems` loses its answer and gains a
 *     `masked` data-absent-reason marker.
 *  2. The total score is dropped unless the share explicitly permits it. A GAD-7
 *     total is a sum of the seven items, so publishing the total alongside a
 *     partially hidden set leaks information about what was hidden — with six of
 *     seven items visible, the seventh is exactly `total - sum(visible)`. The
 *     score therefore travels only when `shareScore` is on, and even then it is
 *     recomputed from the *visible* items whenever anything scored was hidden, so
 *     it can never act as an oracle for a masked answer.
 */
export function redactResponse(
  response: QuestionnaireResponse,
  policy: { hiddenItems?: string[]; shareScore?: boolean }
): { resource: QuestionnaireResponse; summary: RedactionSummary } {
  const hidden = new Set(policy.hiddenItems ?? []);
  const redactedLinkIds: string[] = [];

  /**
   * Walk the item tree, masking anything the policy hides.
   *
   * Recursion matters even though the GAD-7 is flat: `item.item` is legal FHIR,
   * and a redactor that only looked at the top level would silently pass a
   * hidden answer through as soon as anyone added a grouped instrument. Masking
   * a group masks its children with it — you cannot withhold a heading and
   * still publish what was under it.
   */
  function walk(items: QuestionnaireResponseItem[]): QuestionnaireResponseItem[] {
    return items.map((item) => {
      if (hidden.has(item.linkId)) {
        redactedLinkIds.push(item.linkId);
        return maskItem(item);
      }
      if (item.item?.length) {
        return { ...item, item: walk(item.item) };
      }
      return item;
    });
  }

  const items = walk(response.item ?? []);

  // Did we hide anything that feeds the total? If so, a stored total would be a
  // back door to the masked answers, so any score we emit must be recomputed
  // from what remains visible.
  const hidScoredItem = redactedLinkIds.some((id) => GAD7_SCORED_LINK_IDS.includes(id));
  const shareScore = policy.shareScore !== false;

  const extension: QuestionnaireResponse['extension'] = [];
  if (shareScore) {
    const total = hidScoredItem ? computeGad7Total(items) : gad7TotalOf(response);
    extension.push({ url: GAD7_SCORE_EXTENSION, valueDecimal: total });
  }

  const resource: QuestionnaireResponse = {
    ...response,
    item: items,
    // Carry other extensions through untouched; only the score is policy-gated.
    extension: [
      ...extension,
      ...(response.extension ?? []).filter((e) => e.url !== GAD7_SCORE_EXTENSION),
    ],
  };

  return {
    resource,
    summary: { redactedLinkIds, scoreWithheld: !shareScore },
  };
}

/**
 * Strip an item's answers, leaving the question and a `masked` marker behind.
 *
 * Built as an allowlist — only `linkId` and `text` are copied — rather than by
 * deleting `answer` from a clone. That is deliberate: anything not named here
 * cannot survive, so nested `item[]` and any future answer field are dropped
 * automatically instead of leaking through a field the redactor forgot about.
 */
function maskItem(item: QuestionnaireResponseItem): QuestionnaireResponseItem {
  return {
    linkId: item.linkId,
    ...(item.text !== undefined ? { text: item.text } : {}),
    // No `answer` and no child `item` — plus an explicit marker so the receiver
    // renders "withheld by the sharing organization", not "no answer given".
    extension: [{ url: REDACTED_EXTENSION, valueCode: REDACTED_REASON }],
  };
}
