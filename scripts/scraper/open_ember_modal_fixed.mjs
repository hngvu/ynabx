import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  const res = await page.evaluate(() => {
    try {
      const appWrapper = window.emberInspectorApps?.[0];
      const realApp = appWrapper?.app;
      const instances = realApp?._applicationInstances ? Array.from(realApp._applicationInstances.values()) : [];
      const instance = instances[0];
      if (instance) {
        // Mock applicationService.sidebarViewModel
        const appService = instance.lookup('service:application');
        if (appService && !appService.sidebarViewModel) {
          appService.sidebarViewModel = { budgetName: "ops's Plan" };
        }
        
        const modalService = instance.lookup('service:modal');
        if (modalService) {
          modalService.setDataForModal({ isCreate: false });
          modalService.openModal('modals/settings');
          return { success: true };
        }
      }
      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  console.log('Result:', res);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_plan_settings_4200.png' });
  await browser.close();
})();
