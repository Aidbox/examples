// Drives a mix of FHIR traffic through Aidbox so the audit dashboard has
// something to show. Every request below becomes a BALP AuditEvent.
//
//   bun run scripts/generate-traffic.ts            # default: 30 patients
//   PATIENTS=100 bun run scripts/generate-traffic.ts
//   PACE_MS=0 bun run scripts/generate-traffic.ts  # as fast as possible

const AIDBOX = process.env.AIDBOX_URL ?? "http://localhost:8080";
const PATIENTS = Number(process.env.PATIENTS ?? 30);
// Pause between requests so the traffic spreads over ~1.5 min and the
// dashboard timeline (last 15 min, auto-refresh) fills in visibly.
const PACE_MS = Number(process.env.PACE_MS ?? 250);

const CLIENTS = {
  ehr: ["ehr-frontend", "ehr-secret"],
  lab: ["lab-integration", "lab-secret"],
  billing: ["billing-service", "billing-secret"],
} as const;

type Client = keyof typeof CLIENTS;

async function fhir(client: Client, method: string, path: string, body?: unknown) {
  await Bun.sleep(PACE_MS);
  const [id, secret] = CLIENTS[client];
  const res = await fetch(`${AIDBOX}/fhir/${path}`, {
    method,
    headers: {
      authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.warn(`${client} ${method} ${path} -> ${res.status}`);
  }
  return res.ok ? res.json() : undefined;
}

const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const FAMILY = ["Smith", "Garcia", "Chen", "Okafor", "Novak", "Haddad", "Silva", "Kowalski"];
const GIVEN = ["Ana", "Ben", "Chloe", "Dmitri", "Eve", "Farah", "Goran", "Hana"];

console.log(`ehr-frontend: registering ${PATIENTS} patients`);
const patients: string[] = [];
for (let i = 0; i < PATIENTS; i++) {
  const p = await fhir("ehr", "POST", "Patient", {
    resourceType: "Patient",
    name: [{ family: pick(FAMILY), given: [pick(GIVEN)] }],
    gender: pick(["male", "female"]),
    birthDate: `19${50 + Math.floor(Math.random() * 50)}-0${1 + Math.floor(Math.random() * 9)}-1${Math.floor(Math.random() * 9)}`,
  });
  if (p) patients.push(p.id);
}

console.log("ehr-frontend: chart reviews (read, search, update)");
for (const id of patients) {
  for (let n = 0; n < 1 + Math.floor(Math.random() * 4); n++) {
    await fhir("ehr", "GET", `Patient/${id}`);
  }
  await fhir("ehr", "GET", `Encounter?patient=${id}`);
  if (Math.random() < 0.3) {
    await fhir("ehr", "PUT", `Patient/${id}`, {
      resourceType: "Patient",
      id,
      active: true,
      telecom: [{ system: "phone", value: `555-01${Math.floor(Math.random() * 90 + 10)}` }],
    });
  }
}

console.log("lab-integration: posting results");
for (const id of patients) {
  for (let n = 0; n < 1 + Math.floor(Math.random() * 3); n++) {
    await fhir("lab", "POST", "Observation", {
      resourceType: "Observation",
      status: "final",
      code: { coding: [{ system: "http://loinc.org", code: pick(["2339-0", "718-7", "2160-0"]) }] },
      subject: { reference: `Patient/${id}` },
      valueQuantity: { value: Math.round(Math.random() * 200), unit: "mg/dL" },
    });
  }
  await fhir("lab", "GET", `Observation?subject=Patient/${id}`);
}

console.log("billing-service: coverage lookups");
for (const id of patients.slice(0, Math.ceil(patients.length / 2))) {
  await fhir("billing", "POST", "Coverage", {
    resourceType: "Coverage",
    status: "active",
    beneficiary: { reference: `Patient/${id}` },
    payor: [{ display: "ACME Health" }],
  });
  await fhir("billing", "GET", `Coverage?patient=${id}`);
}

console.log("ehr-frontend: discharging a few patients (delete)");
for (const id of patients.slice(-3)) {
  await fhir("ehr", "DELETE", `Patient/${id}`);
}

// The thing an auditor is looking for: an integration that normally only
// writes lab results suddenly reads every patient record.
console.log("lab-integration: unusual bulk read of every patient");
for (const id of patients) {
  await fhir("lab", "GET", `Patient/${id}`);
}

console.log("done");

export {};
