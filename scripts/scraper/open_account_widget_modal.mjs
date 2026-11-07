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
      const instance = Array.from(realApp?._applicationInstances.values())[0];
      
      const modalService = instance.lookup('service:modal');
      modalService.setDataForModal({ account: null });
      modalService.openModal('modals/account-widget');
      return { success: true };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });
  console.log('Result:', res);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_account_widget_4200.png' });
  await browser.close();
})();
