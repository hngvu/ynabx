import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');

const regex = /"closeAccount\.([^"]+)":\s*"([^"]*)"/g;
let match;
while ((match = regex.exec(js)) !== null) {
  console.log(`${match[1]}: ${match[2]}`);
}
