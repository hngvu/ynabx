import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

function extractMethod(name) {
  const target = `${name}(`;
  let idx = 12690000;
  let pos = js.indexOf(target, idx);
  if (pos === -1) {
    pos = js.indexOf(target);
  }
  if (pos !== -1) {
    console.log(`=== METHOD: ${name} ===`);
    console.log(js.slice(pos, pos + 1000));
  }
}

extractMethod('closeAccount');
extractMethod('deleteAccount');
extractMethod('reopenAccount');
extractMethod('saveAccountEdits');
