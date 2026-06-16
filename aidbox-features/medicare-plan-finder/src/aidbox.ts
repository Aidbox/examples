export const AIDBOX_URL = process.env.AIDBOX_URL ?? "http://localhost:8888";
const CLIENT_ID = process.env.CLIENT_ID ?? "provider-export";
const CLIENT_SECRET = process.env.CLIENT_SECRET ?? "provider-export-secret";

export interface ExportManifest {
  status?: string;
  output?: { type: string; url: string }[];
}

export async function waitForAidbox(): Promise<void> {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(`${AIDBOX_URL}/health`);
      if (r.ok) return;
    } catch {}
    await sleep(2000);
  }
  throw new Error(`Aidbox at ${AIDBOX_URL} did not become healthy`);
}

export async function mintToken(): Promise<string> {
  const resp = await fetch(`${AIDBOX_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!resp.ok) throw new Error(`token mint failed: ${resp.status} ${await resp.text()}`);
  const body = (await resp.json()) as { access_token: string };
  return body.access_token;
}

export async function requestExport(
  token: string,
  types: readonly string[],
  typeFilters: readonly string[],
): Promise<string> {
  const params = new URLSearchParams({
    _outputFormat: "application/fhir+ndjson+gzip",
    _type: types.join(","),
  });
  for (const f of typeFilters) params.append("_typeFilter", f);

  const resp = await fetch(`${AIDBOX_URL}/fhir/$export?${params}`, {
    headers: {
      Accept: "application/fhir+json",
      Prefer: "respond-async",
      Authorization: `Bearer ${token}`,
    },
  });
  if (resp.status !== 202) throw new Error(`export request failed: ${resp.status} ${await resp.text()}`);
  const statusUrl = resp.headers.get("content-location");
  if (!statusUrl) throw new Error("202 without Content-Location header");
  return statusUrl;
}

export async function pollExportStatus(statusUrl: string, token: string): Promise<ExportManifest> {
  for (let i = 0; i < 150; i++) {
    const resp = await fetch(statusUrl, {
      headers: { Accept: "application/fhir+json", Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`status poll failed: ${resp.status} ${await resp.text()}`);
    const body = (await resp.json()) as ExportManifest;
    if (body.status === "completed" || body.output) return body;
    if (body.status === "failed" || body.status === "error") {
      throw new Error(`export failed: ${JSON.stringify(body)}`);
    }
    await sleep(2000);
  }
  throw new Error("export did not complete in time");
}

export async function requestUploadUrl(
  token: string,
  account: string,
  bucket: string,
  filename: string,
): Promise<string> {
  const resp = await fetch(`${AIDBOX_URL}/aws/storage/${account}/${bucket}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename }),
  });
  if (!resp.ok) throw new Error(`presign failed for ${filename}: ${resp.status} ${await resp.text()}`);
  const body = (await resp.json()) as { url?: string };
  if (!body.url) throw new Error(`presign response missing url for ${filename}`);
  return body.url;
}

export async function putToSignedUrl(url: string, content: string): Promise<void> {
  const resp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: content,
  });
  if (!resp.ok) throw new Error(`signed PUT failed: ${resp.status} ${resp.statusText}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
