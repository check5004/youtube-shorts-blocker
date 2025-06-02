#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Verify all required extension files exist
const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'lock_screen.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

console.log('🔍 Checking extension files...');

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all extension files are present.');
  process.exit(1);
}

// Validate manifest.json
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  if (!manifest.version) {
    throw new Error('Version not found in manifest.json');
  }
  console.log(`📦 Extension version: ${manifest.version}`);
} catch (error) {
  console.log('❌ Invalid manifest.json:', error.message);
  process.exit(1);
}

console.log('\n✅ Extension is ready for release!');
console.log('💡 Run "npm run version:patch" to bump version and prepare for release.');