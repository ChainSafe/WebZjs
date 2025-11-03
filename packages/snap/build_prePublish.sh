#!/bin/bash

# Ensure allowedOrigins only contains the production URL, then build the snap.

set -euo pipefail

MANIFEST_FILE="snap.manifest.json"

echo "Ensuring allowedOrigins only contains https://webzjs.chainsafe.dev..."

jq '.initialPermissions."endowment:rpc".allowedOrigins = ["https://webzjs.chainsafe.dev"]' "$MANIFEST_FILE" > "$MANIFEST_FILE.tmp"
mv "$MANIFEST_FILE.tmp" "$MANIFEST_FILE"

echo "Running mm-snap build..."
mm-snap build

echo "build_prePublish completed."


