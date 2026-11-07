import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');
const target = 'components/modals/modals-settings.hbs';
const idx = js.indexOf(target);
// Let's print 10000 characters before idx
const before = js.substring(idx - 6000, idx);
fs.writeFileSync('scripts/scraper/modals_settings_raw.txt', before);
console.log('Saved to scripts/scraper/modals_settings_raw.txt, length:', before.length);
