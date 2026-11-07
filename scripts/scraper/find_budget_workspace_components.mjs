import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

const matches = [];
let idx = 0;
const prefix = 'ynab_web/app/components/';
while ((idx = js.indexOf(prefix, idx)) !== -1) {
  const end1 = js.indexOf('"', idx);
  const end2 = js.indexOf("'", idx);
  const end = Math.min(end1 === -1 ? Infinity : end1, end2 === -1 ? Infinity : end2);
  const comp = js.slice(idx + prefix.length, end);
  matches.push(comp);
  idx += prefix.length;
}

const all = Array.from(new Set(matches)).sort();
const budgetRelated = all.filter(c => 
  c.includes('budget') || 
  c.includes('inspector') || 
  c.includes('category') || 
  c.includes('table') || 
  c.includes('grid') || 
  c.includes('month') ||
  c.includes('card')
);
console.log('Budget related components:', budgetRelated);
