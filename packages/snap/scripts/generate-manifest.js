const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
const manifestPath = path.join(__dirname, '../snap.manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const origins = manifest.initialPermissions['endowment:rpc'].allowedOrigins;

if (isDev) {
  const devOrigins = [
    'http://localhost:3000',
    'http://app-provider.localhost:3000',
  ];
  for (const origin of devOrigins) {
    if (!origins.includes(origin)) {
      origins.push(origin);
    }
  }
} else {
  manifest.initialPermissions['endowment:rpc'].allowedOrigins =
    origins.filter(o => !o.includes('localhost'));
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated snap.manifest.json (dev: ${isDev})`);
