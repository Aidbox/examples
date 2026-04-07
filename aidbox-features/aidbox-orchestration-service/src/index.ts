/**
 * FHIR Orchestration Service
 * Exposes $getstructuredrecord operation that fetches from multiple sources,
 * deduplicates, stores with provenance, and returns merged bundle.
 */

import {
  SmartBackendServicesAuthProvider,
  BasicAuthProvider,
  importPrivateKey,
  type FhirSource,
} from "./fhir-clients";
import { orchestrate, parseNhsNumberFromParameters } from "./orchestration";
import type { Parameters, OperationOutcome } from "./fhir-types/hl7-fhir-r4-core";

// ============ Configuration ============

// Environment variables with defaults
const PORT = parseInt(process.env.PORT ?? "3000");
const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL ?? "http://localhost:8080";
const GENERAL_PRACTICE_URL = process.env.GENERAL_PRACTICE_URL ?? "http://localhost:8081";
const HOSPITAL_URL = process.env.HOSPITAL_URL ?? "http://localhost:8082";

// SMART Backend Services credentials
const SMART_PRIVATE_KEY_PEM = process.env.SMART_PRIVATE_KEY ?? "";
const SMART_KEY_ID = process.env.SMART_KEY_ID ?? "test-key-001";
const SMART_CLIENT_ID = process.env.SMART_CLIENT_ID ?? "orchestration-service";

// ============ Auth Providers (initialized async) ============

const mainFhirAuth = new BasicAuthProvider(FHIR_SERVER_URL, "root", "secret");
const hospitalAuth = new BasicAuthProvider(HOSPITAL_URL, "orchestration-service", "basic-auth-secret");

let sources: FhirSource[] = [];

async function initializeAuthProviders(): Promise<void> {
  if (!SMART_PRIVATE_KEY_PEM) {
    throw new Error("SMART_PRIVATE_KEY environment variable is required");
  }

  const privateKey = await importPrivateKey(SMART_PRIVATE_KEY_PEM);

  const generalPracticeAuth = new SmartBackendServicesAuthProvider({
    baseUrl: GENERAL_PRACTICE_URL,
    clientId: SMART_CLIENT_ID,
    privateKey,
    keyId: SMART_KEY_ID,
    scope: "system/*.read",
    allowInsecureRequests: true,
  });

  sources = [
    { name: "gp", auth: generalPracticeAuth },
    { name: "hospital", auth: hospitalAuth },
  ];
}

// ============ Error Response Helpers ============

type IssueCode = "invalid" | "structure" | "required" | "value" | "invariant" | "security" | "login" | "unknown" | "expired" | "forbidden" | "suppressed" | "processing" | "not-supported" | "duplicate" | "multiple-matches" | "not-found" | "deleted" | "too-long" | "code-invalid" | "extension" | "too-costly" | "business-rule" | "conflict" | "transient" | "lock-error" | "no-store" | "exception" | "timeout" | "incomplete" | "throttled" | "informational";

function operationOutcome(
  severity: "error" | "warning" | "information" | "fatal",
  code: IssueCode,
  diagnostics: string
): OperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [
      {
        severity,
        code,
        diagnostics,
      },
    ],
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/fhir+json" },
  });
}

// ============ Request Handlers ============

async function handleHealthCheck(): Promise<Response> {
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleGetStructuredRecord(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse(
      operationOutcome("error", "not-supported", "Method not supported"),
      405
    );
  }

  try {
    const body = await req.json() as Parameters;

    if (body.resourceType !== "Parameters") {
      return jsonResponse(
        operationOutcome("error", "invalid", "Request body must be a Parameters resource"),
        400
      );
    }

    const nhsNumber = parseNhsNumberFromParameters(body);

    if (!nhsNumber) {
      return jsonResponse(
        operationOutcome("error", "required", "Missing required parameter: patientNHSNumber"),
        400
      );
    }

    if (!/^\d{10}$/.test(nhsNumber)) {
      return jsonResponse(
        operationOutcome("error", "value", "Invalid NHS Number format. Must be 10 digits."),
        400
      );
    }

    console.log(`[Orchestration] NHS Number: ${nhsNumber}`);

    const result = await orchestrate(nhsNumber, {
      sources,
      mainFhirAuth,
    });

    if (!result.success) {
      return jsonResponse(
        operationOutcome("error", "exception", result.error ?? "Orchestration failed"),
        500
      );
    }

    return jsonResponse(result.bundle);
  } catch (error) {
    console.error("[Orchestration] Error:", error);
    return jsonResponse(
      operationOutcome("error", "exception", "Internal server error"),
      500
    );
  }
}

// ============ Router ============

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  console.log(`${method} ${path}`);

  // Health check
  if (path === "/health" || path === "/") {
    return handleHealthCheck();
  }

  // $getstructuredrecord operation
  if (path === "/fhir/Patient/$getstructuredrecord") {
    return handleGetStructuredRecord(req);
  }

  // Not found
  return jsonResponse(
    operationOutcome("error", "not-found", `Endpoint not found: ${path}`),
    404
  );
}

// ============ Server ============

async function startServer(): Promise<void> {
  console.log(`FHIR Orchestration Service starting...`);
  console.log(`  Main FHIR: ${FHIR_SERVER_URL}`);
  console.log(`  General Practice: ${GENERAL_PRACTICE_URL}`);
  console.log(`  Hospital: ${HOSPITAL_URL}`);

  await initializeAuthProviders();
  console.log(`Auth providers initialized`);

  const server = Bun.serve({
    port: PORT,
    fetch: handleRequest,
  });

  console.log(`Server listening on http://localhost:${server.port}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health`);
  console.log(`  POST /fhir/Patient/$getstructuredrecord`);
  console.log(`\nExample:`);
  console.log(`  curl -X POST http://localhost:${PORT}/fhir/Patient/\\$getstructuredrecord \\`);
  console.log(`    -H "Content-Type: application/fhir+json" \\`);
  console.log(`    -d '{"resourceType":"Parameters","parameter":[{"name":"patientNHSNumber","valueIdentifier":{"system":"https://fhir.nhs.uk/Id/nhs-number","value":"9876543210"}}]}'`);
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
