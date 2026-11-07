import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // 1. Click Add Account button
  const addBtn = await page.$('.nav-add-account');
  if (addBtn) {
    await addBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../../react_add_account_fixed.png' });
    console.log('Saved react_add_account_fixed.png');
    
    // Click Unlinked option
    const unlinkedBtn = await page.getByText('Unlinked', { exact: false }).first();
    if (unlinkedBtn) {
      await unlinkedBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: '../../react_add_account_unlinked_form.png' });
      console.log('Saved react_add_account_unlinked_form.png');
    }
  }
  
  // Close modal with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // 2. Open Plan Settings Modal
  const trigger = await page.$('.sidebar-nav-menu-budget');
  if (trigger) {
    await trigger.click();
    await page.waitForTimeout(500);
    const settingsBtn = await page.$('.modal-select-budget-settings');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '../../react_plan_settings_fixed.png' });
      console.log('Saved react_plan_settings_fixed.png');
    }
  }
  
  await browser.close();
})();
