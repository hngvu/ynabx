import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

function extractObjectOrArray(startStr) {
  const startIdx = js.indexOf(startStr);
  let bracketCount = 0;
  let started = false;
  let openChar = startStr.includes('[') ? '[' : '{';
  let closeChar = openChar === '[' ? ']' : '}';
  for (let i = startIdx; i < startIdx + 150000; i++) {
    if (js[i] === openChar) {
      bracketCount++;
      started = true;
    } else if (js[i] === closeChar) {
      bracketCount--;
      if (started && bracketCount === 0) {
        return js.substring(startIdx + startStr.indexOf(openChar), i + 1);
      }
    }
  }
}

const knStr = extractObjectOrArray('Kn = {');
const znStr = extractObjectOrArray('Zn = [');

let Wn = "1,23,456.78";
const Kn = eval('(' + knStr + ')');
console.log('Kn keys count:', Object.keys(Kn).length);

const Un = new Proxy({}, { get: (_, p) => p });
const Zn = eval('(' + znStr + ')');
console.log('Zn items count:', Zn.length);

fs.writeFileSync('clone/src/components/modals/locales_exact.json', JSON.stringify(Kn, null, 2));
fs.writeFileSync('clone/src/components/modals/currencies_exact.json', JSON.stringify(Zn, null, 2));
console.log('Successfully saved exact metadata!');
