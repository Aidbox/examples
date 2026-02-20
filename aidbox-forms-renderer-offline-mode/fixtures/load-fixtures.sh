#!/usr/bin/env bash
# Load FHIR fixture bundle into Aidbox
#
# Usage:
#   ./fixtures/load-fixtures.sh                          # defaults: localhost:8081, basic:secret
#   ./fixtures/load-fixtures.sh http://localhost:8888     # custom base URL
#   ./fixtures/load-fixtures.sh http://localhost:8888 client:secret  # custom URL and credentials

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AIDBOX_BASE_URL="${1:-http://localhost:8081}"
AIDBOX_CREDENTIALS="${2:-basic:secret}"

echo "Loading fixtures into ${AIDBOX_BASE_URL} ..."

curl -s -f \
  -X POST \
  "${AIDBOX_BASE_URL}/fhir" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n "${AIDBOX_CREDENTIALS}" | base64)" \
  -d @"${SCRIPT_DIR}/bundle.json" \
  | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "Done."
