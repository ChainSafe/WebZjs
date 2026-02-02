const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
const manifestPath = path.join(__dirname, '../snap.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const origins = manifest.initialPermissions['endowment:rpc'].allowedOrigins;

if (isDev) {
  if (!origins.includes('http://localhost:3000')) {
    origins.push('http://localhost:3000');
  }
} else {
  manifest.initialPermissions['endowment:rpc'].allowedOrigins =
    origins.filter(o => !o.includes('localhost'));
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated snap.manifest.json (dev: ${isDev})`);
