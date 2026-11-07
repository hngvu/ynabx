import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_budget_live.png' });
  console.log('Saved react_budget_live.png');
  
  const structure = await page.evaluate(() => {
    const header = document.querySelector('.budget-header');
    const views = document.querySelector('.budget-view-row');
    const table = document.querySelector('.budget-table');
    const inspector = document.querySelector('.budget-inspector');
    return {
      header: !!header,
      views: !!views,
      table: !!table,
      inspector: !!inspector,
      rowsCount: document.querySelectorAll('.budget-table-row').length,
    };
  });
  
  console.log('React Budget Structure:', JSON.stringify(structure, null, 2));
  await browser.close();
})();
