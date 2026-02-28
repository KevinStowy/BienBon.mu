#!/bin/bash
# Generate Dart API client from OpenAPI spec.
# Prerequisites: Java 11+ (for openapi-generator-cli)
#
# Usage: ./scripts/generate-dart.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACT_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$CONTRACT_DIR/openapi.json" ]; then
  echo "ERROR: openapi.json not found. Run 'npm run generate:openapi' in apps/api first."
  exit 1
fi

npx @openapitools/openapi-generator-cli generate \
  -i "$CONTRACT_DIR/openapi.json" \
  -g dart \
  -o "$CONTRACT_DIR/dart/bienbon_api_client" \
  --additional-properties=pubName=bienbon_api_client,pubVersion=0.1.0

echo "Dart client generated at $CONTRACT_DIR/dart/bienbon_api_client/"
