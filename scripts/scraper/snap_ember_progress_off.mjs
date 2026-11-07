import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  // Find progress bar off button and click it
  // In Ember, let's inspect the toggle
  const offBtn = await page.$('.progress-bars-toggle button:last-child, button[title*="Progress Bars Off"]');
  console.log('Off button found:', !!offBtn);
  if (offBtn) {
    await offBtn.click();
    await page.waitForTimeout(1000);
  }
  
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_budget_progress_off.png' });
  console.log('Saved ember_budget_progress_off.png');
  
  const domInfo = await page.evaluate(() => {
    const table = document.querySelector('.budget-table, .budget-table-container');
    const row = document.querySelector('.budget-table-row.is-sub-category');
    const nameCell = row?.querySelector('.budget-table-cell-name');
    return {
      tableClasses: table?.className,
      tableContainerClasses: document.querySelector('.budget-table-container')?.className,
      rowClasses: row?.className,
      rowHeight: row ? window.getComputedStyle(row).height : null,
      nameCellHtml: nameCell?.outerHTML,
      nameCellComputed: nameCell ? {
        height: window.getComputedStyle(nameCell).height,
        padding: window.getComputedStyle(nameCell).padding,
      } : null,
      segmentedControl: document.querySelector('.progress-bars-toggle')?.outerHTML
    };
  });
  
  console.log(JSON.stringify(domInfo, null, 2));
  await browser.close();
})();
