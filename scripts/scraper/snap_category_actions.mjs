import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  // Find Rent button
  const rentBtn = await page.getByRole('button', { name: 'Rent', exact: true });
  console.log('Rent button found:', !!rentBtn);
  if (rentBtn) {
    // try double clicking or right clicking
    await rentBtn.click({ button: 'right' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_rent_right_click.png' });
  }
  
  // Also check hover on Master Category Bills row to see add-subcategory button
  const billsRow = await page.locator('.budget-table-row.is-master-category', { hasText: 'Bills' });
  if (billsRow) {
    await billsRow.hover();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_bills_hover.png' });
    
    // Check if there is an add-category button
    const addSubBtn = await billsRow.locator('.budget-table-cell-add-category, button[aria-label*="Category"]');
    console.log('Add Sub Category button found on hover:', await addSubBtn.count());
    if (await addSubBtn.count() > 0) {
      await addSubBtn.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_add_subcategory_popover.png' });
      console.log('Saved ember_add_subcategory_popover.png');
    }
  }
  
  await browser.close();
})();
