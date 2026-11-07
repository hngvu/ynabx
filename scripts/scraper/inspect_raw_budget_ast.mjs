import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/main-Dmb20EGn.js', 'utf8');

function inspectSnippet(target) {
  const idx = js.indexOf(target);
  if (idx !== -1) {
    console.log(`=== ${target} ===`);
    const astStart = js.lastIndexOf("'[[[", idx);
    console.log(js.slice(astStart, idx + 100));
  }
}

inspectSnippet('components/budget-header/index.hbs');
