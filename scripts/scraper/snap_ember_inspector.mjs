import { chromium } from './node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForSelector('.budget-table-row.is-sub-category', { timeout: 10000 });
  
  // click a subcategory row to select it
  const rows = await page.$$('.budget-table-row.is-sub-category');
  if (rows.length > 1) {
    await rows[1].click(); // click Electric row
    await page.waitForTimeout(1000);
  }
  
  const inspectorHtml = await page.$eval('.budget-inspector', el => el.outerHTML);
  console.log('INSPECTOR HTML (First 1500 chars):\n', inspectorHtml.substring(0, 1500));
  await browser.close();
})();
