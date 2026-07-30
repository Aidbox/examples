/**
 * The GAD-7 (Generalized Anxiety Disorder 7-item scale) as used by this example.
 *
 * Seven items, each answered on the same 0–3 frequency scale, plus a
 * functional-impairment item (`difficulty`) that is *not* part of the score.
 * The total (0–21) bands into minimal / mild / moderate / severe anxiety.
 *
 * The `linkId`s here are the unit of Provider A's field-level redaction: when A
 * hides an item, it hides `gad7-q1`…`gad7-q8` by linkId, which is what the
 * share stores and what the redactor strips.
 */

export const GAD7_QUESTIONNAIRE_URL = 'http://example.org/fhir/Questionnaire/gad7';
/** Resource id of the Questionnaire the init bundle provisions. */
export const GAD7_QUESTIONNAIRE_ID = 'gad7';
export const GAD7_ANSWER_SYSTEM = 'http://example.org/fhir/CodeSystem/gad7-frequency';

/** The shared 0–3 frequency scale every scored GAD-7 item uses. */
export const GAD7_CHOICES = [
  { code: 'not-at-all', display: 'Not at all', score: 0 },
  { code: 'several-days', display: 'Several days', score: 1 },
  { code: 'more-than-half', display: 'More than half the days', score: 2 },
  { code: 'nearly-every-day', display: 'Nearly every day', score: 3 },
] as const;

/**
 * The eight items in presentation order. Q1–Q7 are the scored scale; Q8 is the
 * standard functional-impairment follow-up, kept separate from the total.
 *
 * `scored` marks the seven that feed the 0–21 total; the impairment item does not.
 */
export const GAD7_ITEMS = [
  { linkId: 'gad7-q1', text: 'Feeling nervous, anxious, or on edge', scored: true },
  { linkId: 'gad7-q2', text: 'Not being able to stop or control worrying', scored: true },
  { linkId: 'gad7-q3', text: 'Worrying too much about different things', scored: true },
  { linkId: 'gad7-q4', text: 'Trouble relaxing', scored: true },
  { linkId: 'gad7-q5', text: "Being so restless that it's hard to sit still", scored: true },
  { linkId: 'gad7-q6', text: 'Becoming easily annoyed or irritable', scored: true },
  { linkId: 'gad7-q7', text: 'Feeling afraid as if something awful might happen', scored: true },
  {
    linkId: 'gad7-q8',
    text: 'How difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?',
    scored: false,
  },
] as const;

/** The distinct answer scale for the impairment item (Q8). */
export const GAD7_DIFFICULTY_CHOICES = [
  { code: 'not-difficult', display: 'Not difficult at all', score: 0 },
  { code: 'somewhat-difficult', display: 'Somewhat difficult', score: 1 },
  { code: 'very-difficult', display: 'Very difficult', score: 2 },
  { code: 'extremely-difficult', display: 'Extremely difficult', score: 3 },
] as const;

/**
 * The seven scored linkIds, for score computation and the leak check.
 *
 * Typed as `string[]` rather than the literal union `GAD7_ITEMS` would infer:
 * callers test *arbitrary* linkIds against it (a hidden item from a share, an
 * item off a submitted response), and a narrow union would reject those.
 */
export const GAD7_SCORED_LINK_IDS: string[] = GAD7_ITEMS.filter((i) => i.scored).map(
  (i) => i.linkId
);
