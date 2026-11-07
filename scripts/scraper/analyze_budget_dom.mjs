import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('scripts/scraper/output/budget_live_dom.html', 'utf8');
const $ = cheerio.load(html);

console.log('Top level containers in .content-min-break:');
$(':root > *').each((i, el) => {
  console.log(i, el.tagName, el.attribs.class, el.attribs.id);
});

console.log('\nMain structural sections:');
console.log('budget-header:', $('.budget-header').length, $('.budget-header').attr('class'));
console.log('budget-views (filter bar):', $('.budget-views').length, $('.budget-views').attr('class'));
console.log('budget-table-container:', $('.budget-table-container').length, $('.budget-table-container').attr('class'));
console.log('budget-inspector:', $('.budget-inspector').length, $('.budget-inspector').attr('class'));
