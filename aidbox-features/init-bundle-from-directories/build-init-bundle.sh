#!/usr/bin/env bash
#
# Build one environment's Aidbox init bundle = common/ + <env>/.
#
#   common/         config/metadata shared by every environment
#   dev/ qa/ prod/  resources specific to that environment (seed data;
#                   prod adds nothing, so its bundle is common only)
#
# Files are ordered by directory number (00_ first). A Parameters resource
# becomes POST $fhir-package-install (bundle-relative url — NOT
# /fhir/$fhir-package-install, which 404s as /fhir/fhir/...); everything else is
# an idempotent PUT-by-id in a "batch" bundle. Per-env secrets are out of scope —
# inject them at container start (see the init-bundle-env-template example).
#
# Usage: ./build-init-bundle.sh [ENV] [OUTPUT_FILE]   (defaults: dev, dist/init-bundle.json)
# Requires: bash, jq.

set -euo pipefail

ENV_NAME="${1:-dev}"
OUTPUT_FILE="${2:-dist/init-bundle.json}"

if [ ! -d "$ENV_NAME" ] || [ "$ENV_NAME" = common ]; then
  echo "error: '$ENV_NAME' is not an environment folder (dev|qa|prod)" >&2; exit 1
fi

# common/ (shared) + the environment's own folder, each sorted by dir number.
files=()
for root in common "$ENV_NAME"; do
  while IFS= read -r f; do [ -n "$f" ] && files+=("$f"); done < <(find "$root" -type f -name '*.json' | sort)
done

mkdir -p "$(dirname "$OUTPUT_FILE")"
jq -s '
  def to_entry:
    if .resourceType == "Parameters"
    then { resource: ., request: { method: "POST", url: "$fhir-package-install" } }
    else { resource: ., request: { method: "PUT", url: (.resourceType + "/" + .id) } }
    end;

  map(
    if .resourceType == null then error("resource is missing resourceType")
    elif .resourceType != "Parameters" and .id == null
    then error("resource \(.resourceType) is missing id") else . end
  )
  | { resourceType: "Bundle", type: "batch", entry: map(to_entry) }
' "${files[@]}" > "$OUTPUT_FILE"

echo "Wrote $(jq '.entry | length' "$OUTPUT_FILE") entries (env: $ENV_NAME) to $OUTPUT_FILE"
