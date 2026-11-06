const fs = require('fs');
const bundle = fs.readFileSync('desktop/dist-ynab/assets/ynab_web/assets/main-Dmb20EGn.js', 'utf8');

const target = 'budget-available-number/index.gts';
const pos = bundle.indexOf(target);
console.log('Found target at:', pos);
if (pos !== -1) {
  // Look backwards for block definition or template
  console.log(bundle.substring(pos - 600, pos + 400));
}
