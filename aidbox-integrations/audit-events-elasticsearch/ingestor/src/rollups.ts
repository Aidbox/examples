// Flattens the nested parts of an AuditEvent into keyword arrays that Kibana
// can aggregate on. The FHIR resource itself is indexed unchanged.

type Coding = { system?: string; code?: string; display?: string };
type CodeableConcept = { coding?: Coding[]; text?: string };
type Reference = {
  reference?: string;
  display?: string;
  type?: string;
  identifier?: { system?: string; value?: string };
};

export type AuditEvent = {
  resourceType: "AuditEvent";
  id?: string;
  recorded?: string;
  type?: Coding;
  subtype?: Coding[];
  action?: string;
  outcome?: string;
  source?: { observer?: Reference; site?: string };
  agent?: {
    type?: CodeableConcept;
    who?: Reference;
    name?: string;
    altId?: string;
    requestor?: boolean;
    network?: { address?: string };
  }[];
  entity?: { what?: Reference; role?: Coding; type?: Coding; description?: string }[];
  [key: string]: unknown;
};

// http://hl7.org/fhir/R4/valueset-audit-event-outcome.html
const OUTCOMES: Record<string, string> = {
  "0": "success",
  "4": "minor failure",
  "8": "serious failure",
  "12": "major failure",
};

const PATIENT_ROLE = "1"; // object-role "Patient"
const QUERY_ROLE = "24"; // object-role "Query"
const REQUEST_ID = "XrequestId"; // BALP BasicAuditEntityType

const uniq = (xs: (string | undefined)[]) =>
  [...new Set(xs.filter((x): x is string => !!x))];

// "Patient/pt-1/_history/3" -> "Patient/pt-1" (deletes reference a version)
const versionless = (ref?: string) => ref?.replace(/\/_history\/[^/]+$/, "");

const refKey = (r?: Reference) =>
  versionless(r?.reference) ?? r?.identifier?.value ?? r?.display;

const resourceType = (r?: Reference) =>
  r?.type ?? versionless(r?.reference)?.match(/(?:^|\/)([A-Z][A-Za-z]+)\/[^/]+$/)?.[1];

// Patients named in a search, e.g. "/fhir/Observation?subject=Patient/pt-1"
// or "?patient=pt-1". Best effort: BALP only adds a patient entity when the
// search itself is on Patient.
function patientsInQuery(query: string): string[] {
  let url: URL;
  try {
    url = new URL(query, "http://x");
  } catch {
    return [];
  }
  const refs: string[] = [];
  for (const [key, value] of url.searchParams) {
    const param = key.split(":")[0].split(".")[0];
    for (const v of value.split(",")) {
      if (/^Patient\/[^/]+$/.test(v)) refs.push(v);
      else if (param === "patient" && /^[A-Za-z0-9\-.]+$/.test(v)) refs.push(`Patient/${v}`);
    }
  }
  return refs;
}

export function rollups(ev: AuditEvent) {
  const agents = ev.agent ?? [];
  const requestor = agents.find((a) => a.requestor);
  const isRequestId = (e: { type?: Coding }) => e.type?.code === REQUEST_ID;
  const entities = (ev.entity ?? []).filter((e) => !isRequestId(e));
  const queries = uniq(
    entities.filter((e) => e.role?.code === QUERY_ROLE).map((e) => e.description),
  );

  return {
    type_code: ev.type?.code,
    subtype_codes: uniq((ev.subtype ?? []).map((c) => c.code)),
    outcome_label: ev.outcome ? (OUTCOMES[ev.outcome] ?? ev.outcome) : undefined,
    source_observer_refs: uniq([refKey(ev.source?.observer)]),
    agent_who: uniq(agents.map((a) => refKey(a.who))),
    // The client/user that made the request; the other agent is Aidbox itself.
    requestor_id: refKey(requestor?.who),
    requestor_address: requestor?.network?.address,
    agent_names: uniq(agents.map((a) => a.name)),
    agent_altIds: uniq(agents.map((a) => a.altId)),
    agent_network_addresses: uniq(agents.map((a) => a.network?.address)),
    entity_what: uniq(entities.map((e) => refKey(e.what))),
    entity_types: uniq(entities.map((e) => resourceType(e.what))),
    patient_refs: uniq([
      ...entities
        .filter((e) => e.role?.code === PATIENT_ROLE || resourceType(e.what) === "Patient")
        .map((e) => versionless(e.what?.reference)),
      ...queries.flatMap(patientsInQuery),
    ]),
    search_queries: queries,
    request_id: (ev.entity ?? []).find(isRequestId)?.what?.identifier?.value,
  };
}
