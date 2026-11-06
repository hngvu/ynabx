const fs = require('fs');
const bundle = fs.readFileSync('desktop/dist-ynab/assets/ynab_web/assets/main-Dmb20EGn.js', 'utf8');

const regex = /moduleName:\s*"([^"]*components\/budget[^"]*)"/g;
let m;
const modules = [];
while ((m = regex.exec(bundle)) !== null) {
  modules.push(m[1].replace('/home/runner/_work/evergreen/evergreen/ynab_web/app/components/', ''));
}
console.log('Total budget components found:', modules.length);
modules.forEach(m => console.log(' ', m));
