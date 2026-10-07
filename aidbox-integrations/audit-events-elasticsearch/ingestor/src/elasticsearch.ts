import { INDEX_PREFIX, TEMPLATE_NAME, indexTemplate } from "./mapping";
import { rollups, type AuditEvent } from "./rollups";

const ES_URL = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";

async function es(method: string, path: string, body?: unknown, ndjson = false) {
  return fetch(`${ES_URL}${path}`, {
    method,
    headers: { "content-type": ndjson ? "application/x-ndjson" : "application/json" },
    body: body === undefined ? undefined : ndjson ? (body as string) : JSON.stringify(body),
  });
}

export async function installTemplate() {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await es("PUT", `/_index_template/${TEMPLATE_NAME}`, indexTemplate);
      if (res.ok) return;
      throw new Error(`${res.status} ${await res.text()}`);
    } catch (e) {
      if (attempt >= 60) throw e;
      console.log(`waiting for Elasticsearch (${(e as Error).message})`);
      await Bun.sleep(2000);
    }
  }
}

// One index per day of `recorded`: auditevent-yyyy-MM-dd.
// Keying on the event's own timestamp rather than "now" means a redelivered
// event lands in the same index and overwrites itself.
function indexFor(ev: AuditEvent) {
  const day = (ev.recorded ?? new Date().toISOString()).slice(0, 10);
  return `${INDEX_PREFIX}${day}`;
}

export type BulkResult = { indexed: number; rejected: number; retryable: boolean };

export async function bulkIndex(events: AuditEvent[]): Promise<BulkResult> {
  if (events.length === 0) return { indexed: 0, rejected: 0, retryable: false };

  const lines = events.flatMap((ev) => [
    // _id = AuditEvent.id makes at-least-once delivery idempotent.
    JSON.stringify({ index: { _index: indexFor(ev), ...(ev.id && { _id: ev.id }) } }),
    JSON.stringify({ ...ev, ...rollups(ev) }),
  ]);

  const res = await es("POST", "/_bulk", lines.join("\n") + "\n", true).catch((e: Error) => e);
  if (res instanceof Error || !res.ok) {
    const reason = res instanceof Error ? res.message : `${res.status} ${await res.text()}`;
    console.error(`bulk failed, Aidbox will redeliver: ${reason}`);
    return { indexed: 0, rejected: events.length, retryable: true };
  }

  const body = (await res.json()) as {
    errors: boolean;
    items: { index: { status: number; error?: unknown; _id: string } }[];
  };
  let rejected = 0;
  let retryable = false;
  for (const { index } of body.items) {
    if (!index.error) continue;
    rejected++;
    // 429 / 5xx: let Aidbox redeliver the batch. 4xx: the document itself is
    // bad and will never index, so log it and move on.
    if (index.status === 429 || index.status >= 500) retryable = true;
    console.error(`rejected ${index._id}: ${index.status} ${JSON.stringify(index.error)}`);
  }
  return { indexed: events.length - rejected, rejected, retryable };
}
