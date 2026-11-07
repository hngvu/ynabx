import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  // Right click on Rent row to trigger contextmenu -> editCategory
  const rentRow = await page.locator('.budget-table-row.is-sub-category', { hasText: 'Rent' });
  if (rentRow) {
    await rentRow.click({ button: 'right' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_edit_category_popover.png' });
    console.log('Saved ember_edit_category_popover.png');
  }
  
  // Inspect the popover HTML
  const popover = await page.evaluate(() => {
    const el = document.querySelector('.modal-budget-edit-category');
    return {
      classes: el?.className,
      html: el?.outerHTML,
      rect: el ? el.getBoundingClientRect() : null,
    };
  });
  
  console.log(JSON.stringify(popover, null, 2));
  await browser.close();
})();
