#!/usr/bin/env bash
#
# Build one environment's Aidbox init bundle = common/ + <env>/.
#
#   common/         config/metadata shared by every environment
#   dev/ qa/ prod/  resources specific to that environment (seed data;
#                   prod adds nothing, so its bundle is common only)
#
# Files are ordered by directory number (00_ first). A bare resource file
# becomes an idempotent PUT by resourceType/id; a file that carries its own
# "request" (e.g. the $fhir-package-install operation) is used as a bundle entry
# verbatim. Everything goes into one "batch" bundle. Per-env secrets are out of
# scope — inject them at container start (see the init-bundle-env-template example).
#
# NOTE for operation entries: request.url is relative to the FHIR base —
# "$fhir-package-install", NOT "/fhir/$fhir-package-install" (which 404s as
# /fhir/fhir/...).
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
  map(
    if has("request") then .
    elif .resourceType == null then error("file has no request and no resourceType")
    elif .id == null then error("resource \(.resourceType) has no id (needed for PUT)")
    else { resource: ., request: { method: "PUT", url: (.resourceType + "/" + .id) } }
    end
  )
  | { resourceType: "Bundle", type: "batch", entry: . }
' "${files[@]}" > "$OUTPUT_FILE"

echo "Wrote $(jq '.entry | length' "$OUTPUT_FILE") entries (env: $ENV_NAME) to $OUTPUT_FILE"
