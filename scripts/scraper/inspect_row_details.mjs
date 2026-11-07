import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  const snippets = await page.evaluate(() => {
    const masterRow = document.querySelector('.budget-table-row.is-master-category');
    const subRow = document.querySelector('.budget-table-row.is-sub-category');
    return {
      masterRowHtml: masterRow?.outerHTML,
      subRowHtml: subRow?.outerHTML,
    };
  });
  
  console.log('=== MASTER ROW HTML ===\n', snippets.masterRowHtml);
  console.log('\n=== SUB ROW HTML ===\n', snippets.subRowHtml);
  await browser.close();
})();
