import { chromium } from './node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForSelector('.budget-table-row.is-sub-category', { timeout: 10000 });
  
  const rows = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('.budget-table-row.is-sub-category').forEach(r => {
      const name = r.querySelector('.budget-table-cell-name button')?.textContent?.trim() || '';
      const statusHtml = r.querySelector('.budget-table-cell-goal-status')?.innerHTML || '';
      const detailsHtml = r.querySelector('.budget-table-cell-goal-status-details')?.innerHTML || '';
      const segments = Array.from(r.querySelectorAll('.ynab-new-budget-bar-v2-segment')).map(s => ({
        class: s.className,
        style: s.getAttribute('style')
      }));
      list.push({ name, statusHtml, detailsHtml, segments });
    });
    return list;
  });
  console.log(JSON.stringify(rows, null, 2));
  await browser.close();
})();
