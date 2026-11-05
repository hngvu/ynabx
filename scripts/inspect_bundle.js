const fs = require('fs');
const path = 'ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js';

if (!fs.existsSync(path)) {
  console.log('File not found:', path);
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
console.log('File size (MB):', (content.length / (1024 * 1024)).toFixed(2));

// Test define/module patterns
const defineMatches = [...content.matchAll(/define\(\s*["']([^"']+)["']/g)].map(m => m[1]);
console.log('Explicit define() count:', defineMatches.length);
if (defineMatches.length > 0) {
  console.log('Sample define modules:', defineMatches.slice(0, 10));
}

// Check other bundle files in assets/ynab_web/assets
const dir = 'ynab-ember-web/assets/ynab_web/assets';
const files = fs.readdirSync(dir);
console.log('Files in ynab_web/assets:', files);
