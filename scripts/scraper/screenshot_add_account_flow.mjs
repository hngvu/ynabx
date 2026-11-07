import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // Click on "Add Account" in the sidebar
  const addAccountBtn = await page.$('.button-sidebar.nav-add-account, button:has-text("Add Account")');
  console.log('addAccountBtn found:', !!addAccountBtn);
  if (addAccountBtn) {
    await addAccountBtn.click();
    await page.waitForTimeout(500);
  }
  
  // 1. Screenshot Screen 1 (search institutions & popular options)
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_add_account_screen1.png' });
  console.log('Saved Screen 1');

  // 2. Click "Add Unlinked Account"
  const unlinkedBtn = await page.$('button:has-text("Add Unlinked Account")');
  if (unlinkedBtn) {
    await unlinkedBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_add_account_screen2_form.png' });
  console.log('Saved Screen 2 (Form)');

  // 3. Click Select Account Type button
  const typeSelectBtn = await page.$('.account-type-select-button');
  if (typeSelectBtn) {
    await typeSelectBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_add_account_screen3_types.png' });
  console.log('Saved Screen 3 (Account Types)');

  await browser.close();
})();
