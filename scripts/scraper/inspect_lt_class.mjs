import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');
const target = '($lt = class extends zt';
const idx = js.indexOf(target);
const endIdx = js.indexOf('a(', idx + 100);
const classCode = js.slice(idx, endIdx);
console.log('Class length:', classCode.length);

const getters = [...classCode.matchAll(/get\s+([a-zA-Z0-9_$]+)\s*\(/g)].map(m => m[1]);
console.log('Getters:', getters);

const methods = [...classCode.matchAll(/([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/g)].map(m => m[1]);
console.log('Methods:', [...new Set(methods.filter(m => !['get', 'if', 'for', 'switch', 'an', 'sn'].includes(m)))]);
