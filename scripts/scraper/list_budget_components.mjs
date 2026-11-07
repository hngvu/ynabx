import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

const matches = [];
let idx = 0;
const prefix = 'ynab_web/app/components/budget/';
while ((idx = js.indexOf(prefix, idx)) !== -1) {
  const end1 = js.indexOf('"', idx);
  const end2 = js.indexOf("'", idx);
  const end = Math.min(end1 === -1 ? Infinity : end1, end2 === -1 ? Infinity : end2);
  matches.push(js.slice(idx + 13, end));
  idx += prefix.length;
}

console.log('Total matches:', matches.length);
console.log(Array.from(new Set(matches)).sort());
