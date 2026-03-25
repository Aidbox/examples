/**
 * FHIR Facade Service
 * Synchronous proxy between clients (FHIR API) and HIS API with Redis caching
 */

import { HISClient, createHISClient } from "../shared/his-client";
import { RedisCache, createCache } from "./cache";
import { buildWardBundle, type Bundle } from "../shared/fhir-mapper";
import type { OperationOutcome } from "../fhir-types/hl7-fhir-r4-core/OperationOutcome";
import type { WardPatientData } from "../shared/types/his";

// ============ Configuration ============

const PORT = parseInt(process.env.PORT ?? "3000");
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS ?? "60");

// ============ Globals ============

let hisClient: HISClient;
let wardCache: RedisCache<Bundle>;

// ============ Error Response Helpers ============

function operationOutcome(
  severity: OperationOutcome["issue"][0]["severity"],
  code: OperationOutcome["issue"][0]["code"],
  diagnostics: string
): OperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [{ severity, code, diagnostics }],
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
  const redisOk = await wardCache.ping();

  return new Response(
    JSON.stringify({
      status: redisOk ? "ok" : "degraded",
      redis: redisOk ? "connected" : "disconnected",
    }),
    {
      status: redisOk ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    }
  );
}

async function handleGetWardPatients(wardId: string, baseUrl: string): Promise<Response> {
  // Check cache first
  const cached = await wardCache.get(wardId);
  if (cached) {
    console.log(`[Cache] HIT for ward ${wardId}`);
    return jsonResponse(cached);
  }

  console.log(`[Cache] MISS for ward ${wardId}`);

  try {
    // Fetch ward patients from HIS
    const inpatients = await hisClient.getWardPatients(wardId);

    if (inpatients.length === 0) {
      const emptyBundle = buildWardBundle(wardId, undefined, undefined, [], baseUrl);
      await wardCache.set(wardId, emptyBundle);
      return jsonResponse(emptyBundle);
    }

    // Get ward/site name from first inpatient's currentLocation
    const firstLocation = inpatients[0]?.currentLocation;
    const wardName = firstLocation?.wardName;
    const siteName = firstLocation?.siteName;

    // Fetch patient details for each inpatient
    const patientsData: WardPatientData[] = [];

    for (const inpatient of inpatients) {
      try {
        const patient = await hisClient.getPatientDetails(inpatient.patientId);
        patientsData.push({ inpatient, patient });
      } catch (error) {
        console.error(`[Error] Failed to fetch patient ${inpatient.patientId}:`, error);
      }
    }

    // Build FHIR Bundle
    const bundle = buildWardBundle(wardId, wardName, siteName, patientsData, baseUrl);

    // Cache the result
    await wardCache.set(wardId, bundle);

    return jsonResponse(bundle);
  } catch (error) {
    console.error("[Error] Failed to fetch ward data:", error);

    if (error instanceof Error) {
      return jsonResponse(
        operationOutcome("error", "exception", error.message),
        500
      );
    }

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

  console.log(`${method} ${path}${url.search}`);

  if (path === "/health" || path === "/") {
    return handleHealthCheck();
  }

  // Custom FHIR operation: $get-ward-patients (system-level)
  // GET /fhir/$get-ward-patients?ward-id={wardId}
  if (path === "/fhir/$get-ward-patients" && method === "GET") {
    const wardId = url.searchParams.get("ward-id");
    if (!wardId) {
      return jsonResponse(
        operationOutcome("error", "required", "Missing required parameter: ward-id"),
        400
      );
    }
    const baseUrl = `${url.protocol}//${url.host}/fhir`;
    return handleGetWardPatients(wardId, baseUrl);
  }

  return jsonResponse(
    operationOutcome("error", "not-found", `Endpoint not found: ${path}`),
    404
  );
}

// ============ Server ============

async function startServer(): Promise<void> {
  console.log(`FHIR Facade Service starting...`);
  console.log(`  Cache TTL: ${CACHE_TTL_SECONDS}s`);

  wardCache = createCache<Bundle>();
  console.log(`  Redis cache initializing...`);

  const redisOk = await wardCache.ping();
  if (!redisOk) {
    console.error("Failed to connect to Redis");
    process.exit(1);
  }
  console.log(`  Redis connected`);

  try {
    hisClient = createHISClient();
    console.log(`  HIS client initialized`);
  } catch (error) {
    console.error("Failed to initialize HIS client:", error);
    process.exit(1);
  }

  const server = Bun.serve({
    port: PORT,
    fetch: handleRequest,
  });

  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await wardCache.close();
    process.exit(0);
  });

  console.log(`Server listening on http://localhost:${server.port}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health`);
  console.log(`  GET  /fhir/$get-ward-patients?ward-id={wardId}`);
  console.log(`\nExample:`);
  console.log(
    `  curl "http://localhost:${PORT}/fhir/\\$get-ward-patients?ward-id=ward-001"`
  );
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
