import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

// Extract Wn
const wnMatch = js.match(/Wn\s*=\s*["']([^"']+)["']/);
const Wn = wnMatch ? wnMatch[1] : "1,23,456.78";

// Extract Yn (number formats)
const ynIdx = js.indexOf('Yn = [');
const endYn = js.indexOf('];', ynIdx);
const ynStr = js.substring(ynIdx + 5, endYn + 1);
const Yn = eval(`const Wn = "${Wn}"; ${ynStr}`);
fs.writeFileSync('clone/src/components/modals/number_formats.json', JSON.stringify(Yn, null, 2));
console.log('Exported number formats:', Yn.length);

// Extract Kn (locale definitions)
const knIdx = js.indexOf('Kn = {');
const endKn = js.indexOf('};', knIdx);
const knStr = js.substring(knIdx + 5, endKn + 1);
const Kn = eval(`const Wn = "${Wn}"; (${knStr})`);
fs.writeFileSync('clone/src/components/modals/locales_data.json', JSON.stringify(Kn, null, 2));
console.log('Exported locales:', Object.keys(Kn).length);

// Extract Zn (currencies)
const znIdx = js.indexOf('Zn = [');
const endZn = js.indexOf('];\n  }))();', znIdx);
const znStr = js.substring(znIdx + 5, endZn + 1);
// Zn uses Un.<locale>
const unIdx = js.indexOf('Un || (Un = {})');
// Let's create an Un proxy that returns the key
const Un = new Proxy({}, {
  get(target, prop) {
    return prop;
  }
});
const Zn = eval(`const Un = ${JSON.stringify(
  Object.keys(Kn).reduce((acc, k) => ({ ...acc, [k]: k }), {})
)}; ${znStr}`);
fs.writeFileSync('clone/src/components/modals/currencies_exact.json', JSON.stringify(Zn, null, 2));
console.log('Exported currencies exact:', Zn.length);
