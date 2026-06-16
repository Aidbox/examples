import { mkdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  requestExport,
  mintToken,
  pollExportStatus,
  requestUploadUrl,
  putToSignedUrl,
  waitForAidbox,
} from "./aidbox.ts";
import { scopeFilter, type Resource } from "./filter.ts";
import { buildBundles, buildIndex } from "./bundle.ts";

const PLAN_NET = "http://hl7.org/fhir/us/davinci-pdex-plan-net/StructureDefinition";

const EXPORT_PLAN_IDS = ["plan-sunrise-advantage"];
const EXPORT_NETWORK_IDS = ["network-first"];
const NETWORK_FILTER = EXPORT_NETWORK_IDS.map((id) => `Organization/${id}`).join(",");

const EXPORT_TYPES = [
  "InsurancePlan",
  "Organization",
  "Practitioner",
  "PractitionerRole",
  "Location",
  "OrganizationAffiliation",
];
const EXPORT_TYPE_FILTERS = [
  `InsurancePlan?status=active&_profile=${PLAN_NET}/plannet-InsurancePlan&_id=${EXPORT_PLAN_IDS.join(",")}`,
  `PractitionerRole?active=true&_profile=${PLAN_NET}/plannet-PractitionerRole&network=${NETWORK_FILTER}`,
  `OrganizationAffiliation?active=true&_profile=${PLAN_NET}/plannet-OrganizationAffiliation&network=${NETWORK_FILTER}`,
];

const PUBLISH_ACCOUNT = process.env.PUBLISH_ACCOUNT ?? "minio";
const PUBLISH_BUCKET = process.env.PUBLISH_BUCKET ?? "provider-directory-publish";
const PUBLIC_BASE = process.env.PUBLIC_BASE ?? `http://localhost:9000/${PUBLISH_BUCKET}`;
const FULL_URL_BASE = process.env.FULL_URL_BASE ?? "http://localhost:8888/fhir";
const MAX_BUNDLE_ENTRIES = 1000;

await waitForAidbox();
const token = await mintToken();
console.log("1/4 export: kicking off scoped $export ...");
const statusUrl = await requestExport(token, EXPORT_TYPES, EXPORT_TYPE_FILTERS);
const manifest = await pollExportStatus(statusUrl, token);

console.log("    downloading NDJSON ...");
const byType = new Map<string, Resource[]>();
await mkdir("output/export", { recursive: true });
for (const file of manifest.output ?? []) {
  const resp = await fetch(file.url);
  if (!resp.ok) throw new Error(`download failed for ${file.type}: ${resp.status}`);
  const raw = new Uint8Array(await resp.arrayBuffer());
  const ndjson = file.url.includes(".gz") ? gunzipSync(raw) : Buffer.from(raw);
  await writeFile(`output/export/${file.type}.ndjson`, ndjson);
  const resources = ndjson.toString().split("\n").filter(Boolean).map((l) => JSON.parse(l) as Resource);
  byType.set(file.type, [...(byType.get(file.type) ?? []), ...resources]);
}
for (const [type, resources] of byType) console.log(`    ${type}: ${resources.length} exported`);

console.log("2/4 filter: keeping only the graph reachable from the scope ...");
const { kept, dropped } = scopeFilter(byType, EXPORT_NETWORK_IDS);
for (const [type, n] of dropped) {
  if (n > 0) console.log(`    ${type}: dropped ${n} out-of-scope`);
}

console.log("3/4 bundle: building collection Bundles and index.json ...");
const bundles = buildBundles(kept, FULL_URL_BASE, MAX_BUNDLE_ENTRIES);
const index = buildIndex(bundles, PUBLIC_BASE);
await mkdir("output/published", { recursive: true });
for (const f of bundles) await writeFile(`output/published/${f.name}`, f.content);
await writeFile("output/published/index.json", index);
console.log(`    ${bundles.length} bundle file(s) + index.json -> ./output/published`);

console.log(`4/4 publish: uploading via presigned URLs to ${PUBLISH_BUCKET} ...`);
for (const f of bundles) {
  const url = await requestUploadUrl(token, PUBLISH_ACCOUNT, PUBLISH_BUCKET, f.name);
  await putToSignedUrl(url, f.content);
}
const indexUrl = await requestUploadUrl(token, PUBLISH_ACCOUNT, PUBLISH_BUCKET, "index.json");
await putToSignedUrl(indexUrl, index);

console.log(`\ndone. the directory manifest: ${PUBLIC_BASE}/index.json`);
