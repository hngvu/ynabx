import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/main-Dmb20EGn.js', 'utf8');

function extractTemplate(tmplName) {
  const target = tmplName;
  const idx = js.indexOf(target);
  if (idx === -1) {
    console.log('Not found:', tmplName);
    return null;
  }
  const astStart = js.lastIndexOf("'[[[", idx);
  const astEnd = js.indexOf("']", astStart);
  if (astStart !== -1 && astEnd !== -1) {
    const raw = js.slice(astStart + 1, astEnd + 1);
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) {
      console.log('Parse error for', tmplName, e.message);
    }
  }
  return null;
}

const templates = [
  'templates/budget.hbs',
  'components/budget-header/index.hbs',
  'components/to-be-budgeted/index.hbs',
  'components/budget-table.hbs',
  'components/budget-table-row.hbs',
  'components/budget/budget-inspector/index.hbs',
];

const results = {};
for (const t of templates) {
  results[t] = extractTemplate(t);
  console.log(t, results[t] ? 'OK' : 'FAILED');
}

fs.writeFileSync('scripts/scraper/output/budget_workspace_asts.json', JSON.stringify(results, null, 2));
console.log('Saved budget_workspace_asts.json');
