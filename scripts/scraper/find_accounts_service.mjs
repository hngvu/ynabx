import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

const target = 'Y("accounts")';
let idx = 0;
while ((idx = js.indexOf(target, idx)) !== -1) {
  console.log(js.substring(idx - 50, idx + 100));
  console.log('---');
  idx += target.length;
}
