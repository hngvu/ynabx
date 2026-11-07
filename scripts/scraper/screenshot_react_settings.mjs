import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // Click on the Plan name button in the sidebar
  const headerBtn = await page.$('.sidebar-nav-menu-budget');
  if (headerBtn) {
    await headerBtn.click();
    await page.waitForTimeout(500);
    
    // Find Plan Settings in the popover menu
    const settingsBtn = await page.$('.modal-select-budget-settings');
    console.log('modal-select-budget-settings found:', !!settingsBtn);
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(600);
    }
  }
  
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_plan_settings_verified.png' });
  console.log('Saved screenshot of React clone Plan Settings');
  await browser.close();
})();
