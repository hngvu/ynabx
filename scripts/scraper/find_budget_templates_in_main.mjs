import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/main-Dmb20EGn.js', 'utf8');

const matches = [];
let idx = 0;
const prefix = 'ynab_web/app/';
while ((idx = js.indexOf(prefix, idx)) !== -1) {
  const end1 = js.indexOf('"', idx);
  const end2 = js.indexOf("'", idx);
  const end = Math.min(end1 === -1 ? Infinity : end1, end2 === -1 ? Infinity : end2);
  const path = js.slice(idx + prefix.length, end);
  if (path.includes('budget')) {
    matches.push(path);
  }
  idx += prefix.length;
}

console.log('Total budget items in main-Dmb20EGn.js:', matches.length);
console.log(Array.from(new Set(matches)).sort());
