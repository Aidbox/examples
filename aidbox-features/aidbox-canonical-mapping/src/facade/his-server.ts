/**
 * Sample HIS (Hospital Information System) API Server
 *
 * A proprietary hospital API that returns patient and ward data.
 * Represents the kind of system you'd integrate with in a real deployment.
 *
 * Endpoints:
 *   POST /oauth/token                                    → Access token
 *   GET  /api/{env}/Inpatient/v1/Wards/{wardId}/CurrentInpatients → Ward patients
 *   GET  /api/{env}/PatientService/v1/Patients/{patientId}        → Patient details
 */

import {
  TEST_WARD_ID,
  TEST_PATIENTS,
  toCurrentInpatient,
  toHISPatient,
} from "../shared/test-data";
import type { CurrentInpatientResponse } from "../shared/types/his";

const PORT = parseInt(process.env.PORT ?? "4000");

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Build lookup maps
const inpatientsByWard = new Map<string, CurrentInpatientResponse>();
const patientsById = new Map<string, ReturnType<typeof toHISPatient>>();

// Populate ward-001 with all test patients
const inpatients = TEST_PATIENTS.map(toCurrentInpatient);
inpatientsByWard.set(TEST_WARD_ID, {
  pageIndex: 0,
  pageSize: inpatients.length,
  totalCount: inpatients.length,
  totalPages: 1,
  results: inpatients,
});

// Populate patient lookup
for (const record of TEST_PATIENTS) {
  patientsById.set(record.patient.patientId, toHISPatient(record));
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  console.log(`[HIS] ${method} ${path}`);

  // POST /oauth/token → always return a valid token
  if (path === "/oauth/token" && method === "POST") {
    return json({
      access_token: "his-access-token-" + Date.now(),
      token_type: "Bearer",
      expires_in: 3600,
    });
  }

  // GET /api/{env}/Inpatient/v1/Wards/{wardId}/CurrentInpatients
  const wardMatch = path.match(
    /^\/api\/[^/]+\/Inpatient\/v1\/Wards\/([^/]+)\/CurrentInpatients$/
  );
  if (wardMatch && method === "GET") {
    const wardId = wardMatch[1];
    const data = inpatientsByWard.get(wardId);

    if (!data) {
      // Return empty result for unknown wards
      return json({
        pageIndex: 0,
        pageSize: 0,
        totalCount: 0,
        totalPages: 0,
        results: [],
      });
    }

    return json(data);
  }

  // GET /api/{env}/PatientService/v1/Patients/{patientId}
  const patientMatch = path.match(
    /^\/api\/[^/]+\/PatientService\/v1\/Patients\/([^/]+)$/
  );
  if (patientMatch && method === "GET") {
    const patientId = patientMatch[1];
    const patient = patientsById.get(patientId);

    if (!patient) {
      return json({ error: "Patient not found" }, 404);
    }

    return json(patient);
  }

  // Health check
  if (path === "/health") {
    return json({ status: "ok" });
  }

  return json({ error: "Not found" }, 404);
}

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`HIS API running on http://localhost:${server.port}`);
console.log(`\nAvailable data:`);
console.log(`  Ward: ${TEST_WARD_ID} (${TEST_PATIENTS.length} patients)`);
console.log(`  Patients: ${TEST_PATIENTS.map((p) => p.patient.patientId).join(", ")}`);
console.log(`\nEndpoints:`);
console.log(`  POST /oauth/token`);
console.log(`  GET  /api/{env}/Inpatient/v1/Wards/{wardId}/CurrentInpatients`);
console.log(`  GET  /api/{env}/PatientService/v1/Patients/{patientId}`);
console.log(`\nExample:`);
console.log(
  `  curl http://localhost:${PORT}/api/TEST/Inpatient/v1/Wards/${TEST_WARD_ID}/CurrentInpatients`
);
