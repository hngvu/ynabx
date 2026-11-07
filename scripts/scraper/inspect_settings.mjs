import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');
const target = 'components/modals/modals-settings.hbs';
const idx = js.indexOf(target);
const parseIdx = js.lastIndexOf('JSON.parse', idx);
const endIdx = js.indexOf('moduleName:', parseIdx);

// Look between parseIdx and endIdx
const snippet = js.substring(parseIdx, endIdx);
console.log('Snippet:', snippet);

// Let's also check Jct class implementation (class of modals-settings)
console.log('\n--- Jct Class ---\n');
const jctIdx = js.indexOf('Jct = class');
console.log(js.substring(jctIdx, jctIdx + 3000));
