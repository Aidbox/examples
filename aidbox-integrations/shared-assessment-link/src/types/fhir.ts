/**
 * Minimal structural types for the FHIR resources this example touches.
 * Only the fields the app reads or writes are modelled — enough for type safety
 * without pulling in a full generated FHIR type package.
 */

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface Reference {
  reference?: string;
  display?: string;
}

/** One answer on a QuestionnaireResponse item. */
export interface QuestionnaireResponseAnswer {
  valueCoding?: Coding;
  valueString?: string;
  valueInteger?: number;
  valueBoolean?: boolean;
  valueDecimal?: number;
}

/** One item on a QuestionnaireResponse — the unit of field-level redaction. */
export interface QuestionnaireResponseItem {
  linkId: string;
  text?: string;
  answer?: QuestionnaireResponseAnswer[];
  item?: QuestionnaireResponseItem[];
  /** Used to mark a withheld item with a `masked` data-absent-reason. */
  extension?: Array<{ url: string; valueCode?: string }>;
}

export interface QuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  id?: string;
  meta?: { lastUpdated?: string; versionId?: string };
  questionnaire?: string;
  status?: 'in-progress' | 'completed' | 'amended' | 'entered-in-error' | 'stopped';
  subject?: Reference;
  authored?: string;
  /**
   * Who recorded the answers — how a share scopes to Provider A's own data.
   *
   * `author` rather than `source`: FHIR restricts `source` to a *person*
   * (Patient | Practitioner | PractitionerRole | RelatedPerson), whereas `author`
   * admits an Organization. The spec is explicit that "QuestionnaireResponses
   * authored by other collections of people must use Organization".
   */
  author?: Reference;
  item?: QuestionnaireResponseItem[];
  extension?: Array<{ url: string; valueDecimal?: number; valueString?: string }>;
}

export interface Bundle<T = unknown> {
  resourceType: 'Bundle';
  id?: string;
  type: string;
  timestamp?: string;
  total?: number;
  entry?: Array<{ fullUrl?: string; resource?: T }>;
}

export interface Patient {
  resourceType: 'Patient';
  id?: string;
  name?: Array<{ given?: string[]; family?: string; text?: string }>;
  birthDate?: string;
}
