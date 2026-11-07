import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(2000);
  
  // Try calling modalService.openModal('modals/settings') or trigger
  const opened = await page.evaluate(() => {
    try {
      // Find modal service in Ember container or trigger
      const app = window.YNAB; // or Ember
      const owner = window.Ember?.Namespace?.NAMESPACES?.find(n => n.name === 'ynab-web')?.__container__
        || document.querySelector('.ember-application')?.__container__;
      
      // Or check modalService via jQuery or Ember debug
      const modalService = owner?.lookup('service:modal');
      if (modalService) {
        modalService.setDataForModal({ isCreate: false, wasSubmitted: false });
        modalService.openModal('modals/settings');
        return 'Opened via modalService!';
      }
      return 'owner not found';
    } catch (e) {
      return e.message;
    }
  });
  console.log('Result:', opened);
  await page.waitForTimeout(1000);
  
  const modal = await page.$('.modal, .dialog, .modal-budget-settings');
  if (modal) {
    console.log('Modal opened on port 4200!');
    await page.screenshot({ path: '../../ember_plan_settings_4200.png' });
  } else {
    console.log('Modal not found on port 4200, taking page shot...');
    await page.screenshot({ path: '../../ember_page_4200.png' });
  }
  
  await browser.close();
})();
