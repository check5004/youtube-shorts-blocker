#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Update manifest.json
const manifestPath = 'manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`✅ Updated manifest.json version to ${version}`);
console.log('📝 Next steps:');
console.log('   1. git add .');
console.log('   2. git commit -m "Release v' + version + '"');
console.log('   3. git push origin main');
console.log('   4. GitHub Action will automatically create the release');