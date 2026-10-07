// Webhook receiver for Aidbox's built-in audit topic
// (http://health-samurai.io/fhir/core/StructureDefinition/AuditEventsR4BALP).
//
// Aidbox POSTs a history Bundle: entry[0] is an AidboxSubscriptionStatus,
// the rest are AuditEvents. We bulk-index them and answer 200 only once
// Elasticsearch has them, so Aidbox's at-least-once delivery retries anything
// we could not store.

import { bulkIndex, installTemplate } from "./elasticsearch";
import type { AuditEvent } from "./rollups";

const PORT = Number(process.env.PORT ?? 3000);
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;

type Bundle = { resourceType: "Bundle"; entry?: { resource?: { resourceType?: string } }[] };

await installTemplate();
console.log("index template installed");

Bun.serve({
  port: PORT,
  routes: {
    "/health": new Response("ok"),

    "/audit-events": {
      POST: async (req) => {
        if (WEBHOOK_TOKEN && req.headers.get("authorization") !== `Bearer ${WEBHOOK_TOKEN}`) {
          return new Response("unauthorized", { status: 401 });
        }

        const bundle = (await req.json()) as Bundle;
        const events = (bundle.entry ?? [])
          .map((e) => e.resource)
          .filter((r): r is AuditEvent => r?.resourceType === "AuditEvent");

        const result = await bulkIndex(events);
        console.log(`received ${events.length}, indexed ${result.indexed}, rejected ${result.rejected}`);

        return result.retryable
          ? new Response("elasticsearch unavailable", { status: 503 })
          : Response.json(result);
      },
    },
  },
});

console.log(`ingestor listening on :${PORT}`);
