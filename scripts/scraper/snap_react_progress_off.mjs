import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1500);
  
  // Click on Progress Bars Off button
  const offBtn = await page.$('.progress-bars-toggle button:last-child, button[title*="Progress Bars Off"]');
  console.log('Off button found in React clone:', !!offBtn);
  if (offBtn) {
    await offBtn.click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_budget_progress_off.png' });
  console.log('Saved react_budget_progress_off.png');
  
  const domInfo = await page.evaluate(() => {
    const tableContainer = document.querySelector('.budget-table-container');
    const row = document.querySelector('.budget-table-row.is-sub-category');
    const nameCell = row?.querySelector('.budget-table-cell-name');
    return {
      tableContainerClasses: tableContainer?.className,
      rowClasses: row?.className,
      rowHeight: row ? window.getComputedStyle(row).height : null,
      nameCellHtml: nameCell?.outerHTML,
      nameCellComputed: nameCell ? {
        height: window.getComputedStyle(nameCell).height,
        padding: window.getComputedStyle(nameCell).padding,
      } : null,
    };
  });
  
  console.log(JSON.stringify(domInfo, null, 2));
  await browser.close();
})();
