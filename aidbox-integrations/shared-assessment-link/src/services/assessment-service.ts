import type { FhirClient } from './fhir-client.ts';
import type { QuestionnaireResponse, QuestionnaireResponseItem } from '../types/fhir.ts';
import {
  GAD7_ANSWER_SYSTEM,
  GAD7_CHOICES,
  GAD7_DIFFICULTY_CHOICES,
  GAD7_ITEMS,
  GAD7_QUESTIONNAIRE_URL,
  GAD7_SCORED_LINK_IDS,
} from '../types/gad7.ts';

/** URL of the extension carrying the computed GAD-7 total on a response. */
export const GAD7_SCORE_EXTENSION = 'http://example.org/fhir/StructureDefinition/gad7-total-score';

/**
 * Most assessments one share will carry.
 *
 * A single page — the query does not follow `Bundle.link[next]`, so this is a
 * hard ceiling, not a page size. At GAD-7's usual cadence it is a couple of
 * years of history for one patient; a share that needs more should page.
 */
export const MAX_SHARED_RESPONSES = 100;

/** One answered GAD-7 item as submitted by the intake form. */
export interface Gad7Answer {
  linkId: string;
  /** The answer's code on its scale (e.g. `several-days`, or `very-difficult` for Q8). */
  code: string;
}

/**
 * Captures GAD-7 assessments as FHIR QuestionnaireResponses and reads them back.
 *
 * Provider Organization A's side of the use case: a patient fills in the
 * questionnaire, the answers are stored as a `completed` QuestionnaireResponse
 * stamped with A as the `source` organization, and the total score is carried in
 * an extension so a recipient doesn't have to recompute it (and so A can choose
 * to withhold it).
 */
export class AssessmentService {
  constructor(private readonly fhir: FhirClient) {}

  /**
   * Persist one completed GAD-7 for a patient, attributed to the source organization.
   *
   * Accepts answers either as the renderer's `QuestionnaireResponse.item[]` (the
   * form path) or as a list of `{ linkId, code }` pairs (the API/seed path).
   * Either way this method — not the caller — sets `author`, `status` and the
   * computed score, so a browser cannot claim an assessment belongs to another
   * organization or assert its own total.
   */
  async submitGad7(input: {
    patient: string;
    sourceOrganization: string;
    /** Coded answers, e.g. from the API or a seed script. */
    answers?: Gad7Answer[];
    /** Items straight off a renderer-produced QuestionnaireResponse. */
    items?: QuestionnaireResponseItem[];
    /** Authoring time; defaults to now. Lets the demo seed a history of past assessments. */
    authored?: string;
  }): Promise<QuestionnaireResponse> {
    // Normalize the renderer's items to the same shape the coded path produces,
    // so exactly one representation reaches Aidbox and the scorer.
    const item = input.items ? normalizeItems(input.items) : buildItems(input.answers ?? []);
    if (item.length === 0) {
      throw new Error('A GAD-7 submission must contain at least one answered item');
    }
    const total = computeGad7Total(item);

    const resource: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      questionnaire: GAD7_QUESTIONNAIRE_URL,
      status: 'completed',
      subject: { reference: input.patient },
      authored: input.authored ?? new Date().toISOString(),
      // `author` is how a share scopes to "assessments Provider A recorded".
      author: { reference: input.sourceOrganization },
      item,
      extension: [{ url: GAD7_SCORE_EXTENSION, valueDecimal: total }],
    };

    return this.fhir.create<QuestionnaireResponse>('QuestionnaireResponse', resource);
  }

  /**
   * All completed GAD-7 responses for a patient that the given organization
   * authored, oldest first. This is the live query behind a share: it runs on
   * every manifest poll, so an assessment A completes after minting the link
   * shows up on B's next read without any further action.
   */
  async listGad7(input: {
    patient: string;
    sourceOrganization: string;
    questionnaire?: string;
  }): Promise<QuestionnaireResponse[]> {
    // `author` has a stock search parameter, so the organization scoping is
    // pushed into Aidbox rather than filtered in memory — the share never even
    // reads another organization's assessments for this patient.
    const page = await this.fhir.search<QuestionnaireResponse>('QuestionnaireResponse', [
      ['subject', input.patient],
      ['questionnaire', input.questionnaire ?? GAD7_QUESTIONNAIRE_URL],
      ['status', 'completed'],
      ['author', input.sourceOrganization],
      // Newest first, then reversed below. The sort direction matters: this
      // fetches one page, so past MAX_SHARED_RESPONSES the *oldest* assessments
      // drop off rather than the newest — losing recent history would be the
      // worse failure for a clinician reading a referral.
      ['_sort', '-authored'],
      ['_count', String(MAX_SHARED_RESPONSES)],
    ]);

    // Return oldest-first, the order the share presents them in.
    return page.reverse();
  }
}

/**
 * Reduce renderer-produced items to the canonical shape, keeping only known
 * GAD-7 linkIds and codes.
 *
 * The renderer submits what the Questionnaire declares, which is close to what
 * we want but not identical: item order can differ, unanswered items may appear
 * with an empty `answer`, and the `display` comes from whatever the terminology
 * expansion returned. Rebuilding from `GAD7_ITEMS` means the stored resource is
 * byte-identical to the API path's, and an unrecognised linkId or code is
 * dropped rather than persisted — the browser does not get to widen the
 * instrument.
 */
function normalizeItems(items: QuestionnaireResponseItem[]): QuestionnaireResponseItem[] {
  const answers: Gad7Answer[] = [];
  for (const item of items) {
    const code = item.answer?.[0]?.valueCoding?.code;
    if (code) answers.push({ linkId: item.linkId, code });
  }
  return buildItems(answers);
}

/** Build QuestionnaireResponse items from submitted answers, in questionnaire order. */
function buildItems(answers: Gad7Answer[]): QuestionnaireResponseItem[] {
  const byLinkId = new Map(answers.map((a) => [a.linkId, a.code]));

  return GAD7_ITEMS.flatMap((defn) => {
    const code = byLinkId.get(defn.linkId);
    if (code === undefined) return [];

    const scale = defn.scored ? GAD7_CHOICES : GAD7_DIFFICULTY_CHOICES;
    const choice = scale.find((c) => c.code === code);
    if (!choice) return [];

    return [
      {
        linkId: defn.linkId,
        text: defn.text,
        answer: [
          {
            valueCoding: {
              system: GAD7_ANSWER_SYSTEM,
              code: choice.code,
              display: choice.display,
            },
          },
        ],
      },
    ];
  });
}

/** Sum the seven scored items (0–21). Unanswered items count as 0. */
export function computeGad7Total(items: QuestionnaireResponseItem[] | undefined): number {
  if (!items) return 0;
  let total = 0;
  for (const item of items) {
    if (!GAD7_SCORED_LINK_IDS.includes(item.linkId)) continue;
    const code = item.answer?.[0]?.valueCoding?.code;
    const choice = GAD7_CHOICES.find((c) => c.code === code);
    if (choice) total += choice.score;
  }
  return total;
}

/** The stored total for a response, falling back to recomputing it from the items. */
export function gad7TotalOf(response: QuestionnaireResponse): number {
  const stored = response.extension?.find((e) => e.url === GAD7_SCORE_EXTENSION)?.valueDecimal;
  return stored ?? computeGad7Total(response.item);
}
