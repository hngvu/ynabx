import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/main-Dmb20EGn.js', 'utf8');

const matches = [];
let idx = 0;
while ((idx = js.indexOf('modals/budget/add-sub-category', idx)) !== -1) {
  matches.push(idx);
  idx += 30;
}
console.log('Matches:', matches.length);
for (const m of matches) {
  console.log(js.slice(m - 100, m + 400));
}
