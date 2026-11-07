import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1500);
  
  // 1. Click Category Group button to open AddMasterCategoryPopover
  const addGroupBtn = await page.$('.budget-toolbar-add-category');
  if (addGroupBtn) {
    await addGroupBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_add_category_group.png' });
    console.log('Saved react_add_category_group.png');
  }
  
  // Close popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  
  // 2. Right-click on Rent row to trigger EditCategoryPopover
  const rentRow = await page.locator('.budget-table-row.is-sub-category', { hasText: 'Rent' });
  if (rentRow) {
    await rentRow.click({ button: 'right' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_edit_category_popover.png' });
    console.log('Saved react_edit_category_popover.png');
  }
  
  // Close popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  
  // 3. Hover over Bills row and click (+) to open AddSubCategoryPopover
  const billsRow = await page.locator('.budget-table-row.is-master-category', { hasText: 'Bills' });
  if (billsRow) {
    await billsRow.hover();
    await page.waitForTimeout(200);
    const addSubBtn = await billsRow.locator('.budget-table-cell-add-category');
    if (addSubBtn) {
      await addSubBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_add_subcategory_popover.png' });
      console.log('Saved react_add_subcategory_popover.png');
    }
  }
  
  await browser.close();
})();
