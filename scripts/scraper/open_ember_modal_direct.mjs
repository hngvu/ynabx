import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(2000);
  
  const res = await page.evaluate(() => {
    try {
      const app = window.__ynabapp__ || window.emberInspectorApps?.[0];
      const owner = window.Ember?.getOwner?.(document.querySelector('.ember-view'))
        || app?.__container__
        || app?.__deprecatedInstance__?.__container__;
      
      const modalService = owner?.lookup?.('service:modal');
      if (modalService) {
        modalService.setDataForModal({ isCreate: false, wasSubmitted: false });
        modalService.openModal('modals/settings');
        return { success: true, msg: 'Opened modals/settings!' };
      }
      return { success: false, ownerKeys: owner ? Object.keys(owner) : null };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  console.log('Result:', res);
  await page.waitForTimeout(1000);
  
  const modal = await page.$('.modal, .dialog, .modal-budget-settings');
  if (modal) {
    console.log('Found modal on 4200!');
    await page.screenshot({ path: '../../ember_plan_settings_4200.png' });
  } else {
    console.log('Not found');
  }
  await browser.close();
})();
