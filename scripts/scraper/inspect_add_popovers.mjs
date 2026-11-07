import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  // 1. Inspect Add Category Group popover
  const addGroupBtn = await page.$('.budget-toolbar-add-category');
  if (addGroupBtn) {
    await addGroupBtn.click();
    await page.waitForTimeout(500);
  }
  
  const addGroupPopover = await page.evaluate(() => {
    const el = document.querySelector('.modal-add-master-category');
    return {
      classes: el?.className,
      html: el?.outerHTML,
      modalBox: el ? el.querySelector('.modal')?.outerHTML : null,
    };
  });
  console.log('=== ADD MASTER CATEGORY POPOVER ===\n', JSON.stringify(addGroupPopover, null, 2));
  
  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // 2. Hover over Bills row to click Add Sub Category (+)
  await page.evaluate(() => {
    const rows = document.querySelectorAll('.budget-table-row.is-master-category');
    for (const r of rows) {
      if (r.innerText.includes('Bills')) {
        // Find add button
        const btn = r.querySelector('.budget-table-cell-add-category');
        if (btn) btn.click();
      }
    }
  });
  await page.waitForTimeout(500);
  
  const addSubPopover = await page.evaluate(() => {
    const el = document.querySelector('.modal-add-sub-category');
    return {
      classes: el?.className,
      html: el?.outerHTML,
    };
  });
  console.log('\n=== ADD SUB CATEGORY POPOVER ===\n', JSON.stringify(addSubPopover, null, 2));
  
  await browser.close();
})();
