import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  const addBtn = await page.$('.nav-add-account button');
  if (addBtn) {
    await addBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '../../react_add_account_current.png' });
    console.log('Took react_add_account_current.png');
  } else {
    console.log('No addBtn');
  }
  
  // Close and open Plan Settings
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  const trigger = await page.$('.js-sidebar-nav-menu');
  if (trigger) {
    await trigger.click();
    await page.waitForTimeout(500);
    const settingsBtn = await page.$('.modal-select-budget-settings');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '../../react_plan_settings_current.png' });
      console.log('Took react_plan_settings_current.png');
    }
  }
  
  await browser.close();
})();
