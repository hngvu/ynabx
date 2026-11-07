import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');
const target = 'components/modals/modals-settings.hbs';
const idx = js.indexOf(target);
// Search backward for [id, ["Dialog", ...]] or JSON.parse
// Let's find the closing quote or backtick before moduleName
const beforeModule = js.substring(idx - 4000, idx);
console.log(beforeModule);
