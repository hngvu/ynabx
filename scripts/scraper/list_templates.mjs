import fs from 'fs';

const files = [
  'ynab-ember-web/assets/ynab_web/assets/main-Dmb20EGn.js',
  'ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js'
];

let allModules = [];
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const re = /moduleName:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(c)) !== null) {
    allModules.push({ file: f.split('/').pop(), moduleName: m[1], index: m.index });
  }
}

console.log('Total templates found:', allModules.length);
console.log('Sample 40 templates:');
console.log(allModules.slice(0, 40).map(x => `${x.file}: ${x.moduleName}`).join('\n'));
