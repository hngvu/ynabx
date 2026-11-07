import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1500);
  
  await page.evaluate(() => {
    // Open Plan Settings directly via state or click
    const btn = document.querySelector('.sidebar-nav-menu-budget');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  
  const settingsBtn = await page.$('.modal-select-budget-settings');
  if (settingsBtn) {
    await settingsBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '../../react_plan_settings_dialog.png' });
    console.log('Took react_plan_settings_dialog.png');
  }
  await browser.close();
})();
