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
      
      // Let's inspect modalService and widgetService
      const modalService = instance.lookup('service:modal');
      const widgetService = instance.lookup('service:account-widget') || instance.lookup('service:account-widget/widget');
      
      // Look for services with 'account'
      const container = instance.__container__;
      const services = Object.keys(container?.cache || {}).filter(k => k.includes('account') || k.includes('modal') || k.includes('widget'));
      
      // Let's try opening account widget / add account modal
      // In YNAB, Add Account can be opened via modalService.openModal('modals/account') or widgetService.open()
      let opened = null;
      if (widgetService?.open) {
        widgetService.open();
        opened = 'widgetService.open()';
      } else if (modalService?.openModal) {
        modalService.openModal('modals/account');
        opened = "modalService.openModal('modals/account')";
      }
      
      return {
        services,
        opened,
        hasWidgetService: !!widgetService,
      };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });
  console.log('Ember 4200 Add Account inspection:', res);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_add_account_4200.png' });
  await browser.close();
})();
