import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // 1. Add Account Modal
  const addBtn = await page.$('.nav-add-account');
  await addBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '../../react_add_account_dialog.png' });
  console.log('Took react_add_account_dialog.png');
  
  // Click unlinked
  const unlinked = await page.getByText('Unlinked', { exact: false }).first();
  await unlinked.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '../../react_add_account_unlinked_dialog.png' });
  console.log('Took react_add_account_unlinked_dialog.png');
  
  // Close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // 2. Plan Settings Modal
  const trigger = await page.$('.sidebar-nav-menu-budget');
  await trigger.click();
  await page.waitForTimeout(500);
  const settingsBtn = await page.$('.modal-select-budget-settings');
  await settingsBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '../../react_plan_settings_dialog.png' });
  console.log('Took react_plan_settings_dialog.png');
  
  await browser.close();
})();
