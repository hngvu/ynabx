import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

const target = 'components/account-widget/screens/';
let idx = 0;
const screens = new Set();
while ((idx = js.indexOf(target, idx)) !== -1) {
  const end = js.indexOf('"', idx);
  screens.add(js.substring(idx, end));
  idx += target.length;
}
console.log('Screens in account-widget:', Array.from(screens));
