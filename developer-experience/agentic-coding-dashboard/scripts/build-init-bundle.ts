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
for (const file of files) {
  const content = await Bun.file(join(definitionsDir, file)).json();
  entries.push(content);
}

const bundle = {
  type: "batch",
  resourceType: "Bundle",
  entry: entries,
};

await Bun.write(outputPath, JSON.stringify(bundle, null, 2) + "\n");
console.log(`Built init-bundle.json with ${entries.length} entries`);
