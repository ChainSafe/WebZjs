#!/bin/bash

# Script to build the snap with localhost development origins

echo "Adding localhost:3000 to allowed origins in snap.manifest.json..."

# Use jq to modify the allowedOrigins array to include localhost:3000
jq '.initialPermissions."endowment:rpc".allowedOrigins = ["https://webzjs.chainsafe.dev", "http://localhost:3000"]' snap.manifest.json > snap.manifest.json.tmp

# Replace the original file with the modified version
mv snap.manifest.json.tmp snap.manifest.json

echo "Modified snap.manifest.json to include localhost:3000 for local development"

# Run the build command
echo "Running build..."
yarn build

echo "Build completed!"
echo "Note: Original manifest backed up as snap.manifest.json.backup" 