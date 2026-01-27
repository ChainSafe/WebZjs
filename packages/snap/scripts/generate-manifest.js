const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
const baseManifestPath = path.join(__dirname, '../snap.manifest.base.json');
const outputManifestPath = path.join(__dirname, '../snap.manifest.json');

const base = JSON.parse(fs.readFileSync(baseManifestPath, 'utf8'));

if (isDev) {
  base.initialPermissions['endowment:rpc'].allowedOrigins.push('http://localhost:3000');
}

fs.writeFileSync(outputManifestPath, JSON.stringify(base, null, 2) + '\n');
console.log(`Generated snap.manifest.json (dev: ${isDev})`);
