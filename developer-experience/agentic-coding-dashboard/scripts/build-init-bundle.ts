import { Glob } from "bun";
import { join } from "path";

const definitionsDir = join(import.meta.dir, "../fhir/definitions");
const outputPath = join(import.meta.dir, "../init-bundle.json");

const files: string[] = [];
const glob = new Glob("**/*.json");

for await (const file of glob.scan({ cwd: definitionsDir })) {
  files.push(file);
}

files.sort();

const entries: unknown[] = [];
const viewDefinitionIds: string[] = [];

for (const file of files) {
  const content = await Bun.file(join(definitionsDir, file)).json();
  entries.push(content);
  if (content.resource?.resourceType === "ViewDefinition" && content.resource.id) {
    viewDefinitionIds.push(content.resource.id);
  }
}

// Add $materialize entries for each ViewDefinition so they are materialized on startup
for (const id of viewDefinitionIds) {
  entries.push({
    request: {
      method: "POST",
      url: `/ViewDefinition/${id}/$materialize`,
    },
    resource: {
      resourceType: "Parameters",
      parameter: [{ name: "type", valueCode: "view" }],
    },
  });
}

const bundle = {
  type: "batch",
  resourceType: "Bundle",
  entry: entries,
};

await Bun.write(outputPath, JSON.stringify(bundle, null, 2) + "\n");
console.log(`Built init-bundle.json with ${entries.length} entries`);

// If --upload flag is passed, upload bundle and materialize ViewDefinitions
if (process.argv.includes("--upload")) {
  const baseUrl = process.env.AIDBOX_URL ?? "http://localhost:8080";
  const username = process.env.AIDBOX_ROOT_USER ?? "root";
  const password = process.env.AIDBOX_ROOT_PASSWORD ?? "py26hcPsl9";
  const auth = "Basic " + btoa(`${username}:${password}`);

  console.log("Uploading init bundle...");
  const uploadRes = await fetch(`${baseUrl}/fhir`, {
    method: "POST",
    headers: { "Content-Type": "application/fhir+json", Authorization: auth },
    body: JSON.stringify(bundle),
  });

  if (!uploadRes.ok) {
    console.error("Upload failed:", uploadRes.status, await uploadRes.text());
    process.exit(1);
  }
  console.log("Init bundle uploaded successfully");

  for (const id of viewDefinitionIds) {
    console.log(`Materializing ViewDefinition/${id}...`);
    const matRes = await fetch(`${baseUrl}/fhir/ViewDefinition/${id}/$materialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        resourceType: "Parameters",
        parameter: [{ name: "type", valueCode: "view" }],
      }),
    });

    if (!matRes.ok) {
      console.error(`Materialize failed for ${id}:`, matRes.status, await matRes.text());
      process.exit(1);
    }
    console.log(`ViewDefinition/${id} materialized`);
  }
}
