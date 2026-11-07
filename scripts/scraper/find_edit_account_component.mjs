import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

const targetIdx = 13829100;
const scopeIdx = js.indexOf('scope: () => [', targetIdx);
const endScope = js.indexOf(']', scopeIdx);
const scopeArr = js.substring(scopeIdx, endScope + 1);
const items = scopeArr.replace('scope: () => [', '').replace(']', '').split(',').map(s => s.trim());
console.log('Total scope items:', items.length);
console.log('scope[76] =', items[76]);

// Now let's find the definition of that variable
const varName = items[76];
console.log('Search for', varName, 'definition:');
const varIdx = js.indexOf(varName + ' = class');
if (varIdx !== -1) {
  console.log(js.substring(varIdx, varIdx + 2000));
} else {
  // Let's find template of varName
  const aIdx = js.indexOf('(' + varName + ' =');
  console.log('Assignment:', js.substring(aIdx, aIdx + 300));
}
