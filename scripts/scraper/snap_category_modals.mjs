import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  // 1. Click Category Group button to trigger Add Master Category modal
  const addGroupBtn = await page.$('.budget-toolbar-add-category');
  if (addGroupBtn) {
    await addGroupBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_add_category_group.png' });
    console.log('Saved ember_add_category_group.png');
  }
  
  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // 2. Click category name to trigger Edit Category modal
  const catNameBtn = await page.$('.budget-table-cell-edit-category button, .budget-table-cell-name-row-label-item');
  if (catNameBtn) {
    await catNameBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_edit_category.png' });
    console.log('Saved ember_edit_category.png');
  }
  
  const modalsInfo = await page.evaluate(() => {
    const popover = document.querySelector('.modal-popup, .modal-budget-edit-category, .modal-add-master-category');
    return {
      classes: popover?.className,
      html: popover?.outerHTML,
    };
  });
  
  console.log(JSON.stringify(modalsInfo, null, 2));
  await browser.close();
})();
