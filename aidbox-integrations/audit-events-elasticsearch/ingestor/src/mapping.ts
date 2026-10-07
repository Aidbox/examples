// Elasticsearch index template for FHIR AuditEvents.
//
// The whole FHIR resource is kept in `_source`, `dynamic: false`, nested
// agent/entity, and an `fts_text` field fed by copy_to.
//
// Kibana Lens cannot aggregate on `nested` fields, so on top of that mapping
// we add flat keyword roll-ups which the ingestor computes from the nested
// arrays. See rollups.ts.

const keyword = { type: "keyword" } as const;
const date = { type: "date" } as const;
const bool = { type: "boolean" } as const;
const textNoIndex = { type: "text", index: false } as const;
const binaryNoDoc = { type: "binary", doc_values: false } as const;

type Props = Record<string, unknown>;
type Mapping = { properties: Props; type?: string; copy_to?: string[] };

const nested = (m: Mapping): Mapping => ({ ...m, type: "nested" });

// copy_to fts_text, either on the field itself or on a sub-path.
function fts<T extends object>(m: T, path: string[] = []): T {
  if (path.length === 0) return { ...m, copy_to: ["fts_text"] };
  const [head, ...rest] = path;
  const node = (m as Record<string, object>)[head];
  return { ...m, [head]: fts(node, rest) };
}

const Extension: Mapping = { properties: { url: keyword } };

const Element: Mapping = { properties: { id: keyword, extension: Extension } };

const Coding: Mapping = {
  properties: { system: keyword, code: keyword, display: keyword },
};

const CodeableConcept: Mapping = {
  properties: { text: keyword, coding: nested(Coding) },
};

const Period: Mapping = { properties: { start: date, end: date } };

const Identifier: Mapping = {
  properties: {
    ...Element.properties,
    use: keyword,
    type: CodeableConcept,
    system: keyword,
    value: keyword,
    period: Period,
  },
};

const Reference: Mapping = {
  properties: {
    reference: keyword,
    display: keyword,
    type: keyword,
    identifier: Identifier,
  },
};

const Narrative: Mapping = { properties: { status: keyword, div: keyword } };

const Resource: Mapping = {
  properties: {
    id: keyword,
    meta: {
      properties: {
        versionId: keyword,
        lastUpdated: date,
        source: keyword,
        profile: keyword,
        security: nested(Coding),
        tag: nested(Coding),
      },
    },
    implicitRules: keyword,
    language: keyword,
  },
};

const DomainResource: Mapping = {
  properties: {
    ...Resource.properties,
    text: Narrative,
    contained: Resource,
    extension: Extension,
    modifierExtension: Extension,
  },
};

export const auditEventProperties: Props = {
  ...DomainResource.properties,
  resourceType: keyword,

  agent: nested({
    properties: {
      type: CodeableConcept,
      role: nested(CodeableConcept),
      media: Coding,
      who: fts(Reference, ["properties", "display"]),
      requestor: bool,
      purposeOfUse: nested(CodeableConcept),
      name: fts(keyword),
      network: {
        properties: { type: keyword, address: fts(keyword) },
      },
      location: Reference,
      policy: keyword,
      altId: fts(keyword),
    },
  }),

  type: fts(fts(Coding, ["properties", "code"]), ["properties", "display"]),

  subtype: nested(Coding),
  recorded: date,
  period: Period,
  outcome: keyword,
  outcomeDesc: textNoIndex,
  action: keyword,
  purposeOfEvent: nested(CodeableConcept),

  source: {
    properties: {
      site: keyword,
      type: nested(Coding),
      observer: fts(Reference, ["properties", "display"]),
    },
  },

  entity: nested({
    properties: {
      role: Coding,
      what: fts(Reference, ["properties", "display"]),
      type: Coding,
      lifecycle: Coding,
      securityLabel: nested(Coding),
      name: keyword,
      description: keyword,
      query: binaryNoDoc,
      detail: {
        properties: {
          type: keyword,
          valueString: keyword,
          valueBase64Binary: binaryNoDoc,
        },
      },
    },
  }),

  fts_text: {
    type: "text",
    index_options: "freqs",
    norms: false,
    analyzer: "standard",
  },
};

// Flat, aggregatable fields for Kibana.
export const rollupProperties: Props = {
  type_code: keyword,
  subtype_codes: keyword,
  outcome_label: keyword,
  source_observer_refs: keyword,
  agent_who: keyword,
  requestor_id: keyword,
  requestor_address: keyword,
  agent_names: keyword,
  agent_altIds: keyword,
  agent_network_addresses: keyword,
  entity_what: keyword,
  entity_types: keyword,
  patient_refs: keyword,
  search_queries: keyword,
  request_id: keyword,
};

export const INDEX_PREFIX = "auditevent-";
export const TEMPLATE_NAME = "aidbox-auditevent-template";

export const indexTemplate = {
  index_patterns: [`${INDEX_PREFIX}*`],
  priority: 600,
  version: 1,
  template: {
    settings: {
      index: {
        "sort.field": "recorded",
        "sort.order": "desc",
        // Single-node demo cluster.
        number_of_replicas: 0,
      },
    },
    mappings: {
      dynamic: "false",
      properties: { ...auditEventProperties, ...rollupProperties },
    },
  },
};
