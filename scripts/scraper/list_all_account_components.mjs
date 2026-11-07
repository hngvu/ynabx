import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

const target = 'components/account-widget/';
let idx = 0;
const components = new Set();
while ((idx = js.indexOf(target, idx)) !== -1) {
  const end = js.indexOf('"', idx);
  components.add(js.substring(idx, end));
  idx += target.length;
}
console.log('Account widget components:');
console.log(Array.from(components));
