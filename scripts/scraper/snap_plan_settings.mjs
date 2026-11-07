import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // Open Plan Settings directly by clicking trigger
  const trigger = await page.$('.sidebar-nav-menu-budget');
  if (trigger) {
    await trigger.click();
    await page.waitForTimeout(500);
    const settingsBtn = await page.$('.modal-select-budget-settings');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: '../../react_plan_settings_fixed.png' });
      console.log('Saved react_plan_settings_fixed.png');
    }
  }
  await browser.close();
})();
