#!/usr/bin/env bash
#
# Pack the custom FHIR package (ig/package/) into dist/custom-ig.tgz.
#
# A FHIR npm package is just a gzipped tarball rooted at `package/`, so plain tar
# is enough. The init bundle installs it via $fhir-package-install (see
# common/00_packages/install-packages.json).
#
# Usage: ./build-ig.sh [IG_SRC_DIR] [OUTPUT_DIR]   (defaults: ig, dist)

set -euo pipefail

IG_SRC="${1:-ig}"
OUTPUT_DIR="${2:-dist}"
TARBALL="$OUTPUT_DIR/custom-ig.tgz"

if [ ! -f "$IG_SRC/package/package.json" ]; then
  echo "error: '$IG_SRC/package/package.json' not found" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
# -C "$IG_SRC" so the archive root is `package/`, as FHIR npm packages require.
tar -czf "$TARBALL" -C "$IG_SRC" package

echo "Built $TARBALL from $IG_SRC/package"
