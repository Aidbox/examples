import type { Resource } from "./filter.ts";

export interface BundleFile {
  name: string;
  content: string;
}

export function buildBundles(
  kept: Map<string, Resource[]>,
  fullUrlBase: string,
  maxEntries: number,
): BundleFile[] {
  const files: BundleFile[] = [];
  for (const [type, resources] of kept) {
    for (let i = 0; i < resources.length; i += maxEntries) {
      const chunk = resources.slice(i, i + maxEntries);
      const seq = String(i / maxEntries + 1).padStart(3, "0");
      files.push({
        name: `${type}-${seq}.json`,
        content: JSON.stringify(
          {
            resourceType: "Bundle",
            type: "collection",
            entry: chunk.map((resource) => ({
              fullUrl: `${fullUrlBase}/${resource.resourceType}/${resource.id}`,
              resource,
            })),
          },
          null,
          2,
        ),
      });
    }
  }
  return files;
}

const RESOURCE_TYPE_ORDER = [
  "InsurancePlan",
  "Organization",
  "Practitioner",
  "PractitionerRole",
  "Location",
  "OrganizationAffiliation",
];

export function buildIndex(files: readonly BundleFile[], publicBase: string): string {
  const rank = (name: string) => {
    const i = RESOURCE_TYPE_ORDER.findIndex((t) => name.startsWith(`${t}-`));
    return i < 0 ? RESOURCE_TYPE_ORDER.length : i;
  };
  const ordered = [...files].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  return JSON.stringify(
    { provider_urls: ordered.map((f) => `${publicBase}/${f.name}`) },
    null,
    2,
  );
}
