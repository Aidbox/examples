// Fixtures are real AuditEvents captured from Aidbox's AuditEventsR4BALP topic.
import { expect, test } from "bun:test";
import { rollups, type AuditEvent } from "../src/rollups";
import read from "./fixtures/patient-read.json";
import search from "./fixtures/patient-search.json";
import del from "./fixtures/patient-delete.json";

test("read: requestor is the calling client, not Aidbox", () => {
  const r = rollups(read as AuditEvent);
  expect(r.requestor_id).toBe("ehr-frontend");
  expect(r.agent_who).toEqual(["devbox", "ehr-frontend"]);
  expect(r.subtype_codes).toEqual(["read"]);
  expect(r.outcome_label).toBe("success");
});

test("read: X-Request-Id entity is split out of entity_what", () => {
  const r = rollups(read as AuditEvent);
  expect(r.entity_what).toEqual(["Patient/pt-1"]);
  expect(r.entity_types).toEqual(["Patient"]);
  expect(r.patient_refs).toEqual(["Patient/pt-1"]);
  expect(r.request_id).toMatch(/^[0-9a-f]{32}$/);
});

test("delete: versioned reference is normalised", () => {
  const r = rollups(del as AuditEvent);
  expect(r.entity_what).toEqual(["Patient/pt-1"]);
  expect(r.patient_refs).toEqual(["Patient/pt-1"]);
});

test("search: patient is taken from the query string", () => {
  const r = rollups(search as AuditEvent);
  expect(r.search_queries).toEqual(["/fhir/Observation?subject=Patient/pt-1"]);
  expect(r.patient_refs).toEqual(["Patient/pt-1"]);
  expect(r.entity_what).toEqual([]);
});

test("unparseable query does not throw", () => {
  const ev = {
    resourceType: "AuditEvent",
    entity: [{ role: { code: "24" }, description: "http://[bad" }],
  } as AuditEvent;
  expect(rollups(ev).patient_refs).toEqual([]);
});
