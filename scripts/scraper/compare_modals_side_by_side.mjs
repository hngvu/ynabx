import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  // 1. Capture Ember port 4200 modal
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const appWrapper = window.emberInspectorApps?.[0];
    const realApp = appWrapper?.app;
    const instance = Array.from(realApp?._applicationInstances.values())[0];
    const appService = instance.lookup('service:application');
    if (appService && !appService.sidebarViewModel) {
      appService.sidebarViewModel = { budgetName: "ops's Plan" };
    }
    const modalService = instance.lookup('service:modal');
    modalService.setDataForModal({ isCreate: false });
    modalService.openModal('modals/settings');
  });
  await page.waitForTimeout(500);
  const emberDialog = await page.$('.dialog');
  await emberDialog.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_dialog_crop.png' });

  // 2. Capture React clone port 5174 modal
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  const headerBtn = await page.$('.sidebar-nav-menu-budget');
  if (headerBtn) {
    await headerBtn.click();
    await page.waitForTimeout(400);
    const settingsBtn = await page.$('.modal-select-budget-settings');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
    }
  }
  const reactDialog = await page.$('.dialog');
  await reactDialog.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_dialog_crop.png' });

  console.log('Successfully captured cropped modals for comparison');
  await browser.close();
})();
