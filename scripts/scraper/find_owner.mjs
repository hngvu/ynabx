import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  const res = await page.evaluate(() => {
    // In Ember Octane, Ember.getOwner(object) is how owner is retrieved.
    // What objects exist in DOM or in window.ynab?
    const keys = Object.keys(window.ynab || {});
    let owner = null;
    try {
      owner = window.Ember.getOwner(window.ynab.YNABSharedLib.defaultInstance);
    } catch(e) {}
    
    // Check all elements in document
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      try {
        const o = window.Ember.getOwner(el);
        if (o) {
          owner = o;
          break;
        }
      } catch(e) {}
    }

    if (!owner) {
      // Try emberInspectorApps
      const app = window.emberInspectorApps?.[0];
      for (const k of Object.getOwnPropertyNames(app || {})) {
        if (k.includes('owner') || k.includes('instance') || k.includes('container')) {
          return { foundKey: k };
        }
      }
    }
    
    if (owner) {
      const modalService = owner.lookup('service:modal');
      modalService.setDataForModal({ isCreate: false });
      modalService.openModal('modals/settings');
      return { success: true };
    }
    return { success: false, ynabKeys: keys };
  });
  console.log('Result:', res);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'ember_4200_screenshot.png' });
  await browser.close();
})();
