import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // Click trigger and open Plan Settings
  const trigger = await page.$('.sidebar-nav-menu-budget');
  await trigger.click();
  await page.waitForTimeout(500);
  const settingsBtn = await page.$('.modal-select-budget-settings');
  await settingsBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '../../react_plan_settings_complete.png' });
  console.log('Saved react_plan_settings_complete.png');
  
  // Open Currency dropdown to see full options list
  const currencySelect = await page.$('#modal-settings-currency');
  if (currencySelect) {
    const optionsCount = await page.evaluate(() => {
      const s = document.querySelector('#modal-settings-currency');
      return s ? s.options.length : 0;
    });
    console.log('Currency options count:', optionsCount);
  }
  
  await browser.close();
})();
