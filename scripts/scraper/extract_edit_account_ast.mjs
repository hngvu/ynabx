import fs from 'fs';

const js = fs.readFileSync('ynab-ember-web/assets/ynab_web/assets/wrapper-DkFKwf1z.js', 'utf8');
const target = 'components/modals/sidebar/edit-account.hbs';
const idx = js.indexOf(target);

const astStart = js.lastIndexOf("'[[[", idx);
const endSnippet = ']],[],["div","if",":header",":body",":footer","h3","p","span","dl","dt","dd","input","unless","hr","a"]]\'';
const astEnd = js.indexOf(endSnippet, astStart) + endSnippet.length - 1;

const raw = js.slice(astStart + 1, astEnd);
console.log('astStart:', astStart, 'astEnd:', astEnd, 'length:', raw.length);
const parsed = JSON.parse(raw);
fs.writeFileSync('scripts/scraper/output/edit_account_ast.json', JSON.stringify(parsed, null, 2));
console.log('Parsed successfully!');
