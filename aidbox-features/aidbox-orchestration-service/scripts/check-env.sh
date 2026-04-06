#!/usr/bin/env bash
set -euo pipefail

REQUIRED_VARS=(
  BOX_ADMIN_PASSWORD
  BOX_ROOT_CLIENT_SECRET
  BOX_DB_HOST
  BOX_DB_PORT
  BOX_DB_DATABASE
  BOX_DB_USER
  BOX_DB_PASSWORD
  BOX_WEB_BASE_URL
  BOX_WEB_PORT
  BOX_BOOTSTRAP_FHIR_PACKAGES
  BOX_COMPATIBILITY_VALIDATION_JSON__SCHEMA_REGEX
  BOX_FHIR_BUNDLE_EXECUTION_VALIDATION_MODE
  BOX_FHIR_COMPLIANT_MODE
  BOX_FHIR_CORRECT_AIDBOX_FORMAT
  BOX_FHIR_CREATEDAT_URL
  BOX_FHIR_SCHEMA_VALIDATION
  BOX_FHIR_SEARCH_AUTHORIZE_INLINE_REQUESTS
  BOX_FHIR_SEARCH_CHAIN_SUBSELECT
  BOX_FHIR_SEARCH_COMPARISONS
  BOX_FHIR_TERMINOLOGY_ENGINE
  BOX_FHIR_TERMINOLOGY_ENGINE_HYBRID_EXTERNAL_TX_SERVER
  BOX_FHIR_TERMINOLOGY_SERVICE_BASE_URL
  BOX_MODULE_SDC_STRICT_ACCESS_CONTROL
  BOX_SEARCH_INCLUDE_CONFORMANT
  BOX_SECURITY_AUDIT_LOG_ENABLED
  BOX_SECURITY_DEV_MODE
  BOX_SETTINGS_MODE
)

SERVICES=(fhir_server general_practice hospital)

ERRORS=0

for SERVICE in "${SERVICES[@]}"; do
  echo "--- Checking $SERVICE ---"

  # Resolve container name (docker compose prefixes with project dir name)
  CONTAINER=$(docker compose ps -q "$SERVICE" 2>/dev/null || true)
  if [[ -z "$CONTAINER" ]]; then
    echo "  ERROR: container for '$SERVICE' not found (is it running?)"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  for VAR in "${REQUIRED_VARS[@]}"; do
    VALUE=$(docker exec "$CONTAINER" printenv "$VAR" 2>/dev/null || true)
    if [[ -z "$VALUE" ]]; then
      echo "  MISSING: $VAR"
      ERRORS=$((ERRORS + 1))
    else
      echo "  OK: $VAR"
    fi
  done
done

echo ""
if [[ "$ERRORS" -eq 0 ]]; then
  echo "All required environment variables are set."
else
  echo "$ERRORS variable(s) missing or empty."
  exit 1
fi
