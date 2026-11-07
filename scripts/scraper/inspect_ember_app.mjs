import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(2000);
  
  const debug = await page.evaluate(() => {
    const globals = Object.keys(window).filter(k => k.toLowerCase().includes('ynab') || k.toLowerCase().includes('ember') || k.toLowerCase().includes('app'));
    
    // Look for application view
    let container = null;
    const views = window.Ember?.View?.views || {};
    for (const id in views) {
      if (views[id].container) {
        container = views[id].container;
        break;
      }
    }
    
    // Also check window.__ynab or requirejs or similar
    const testLookup = window.require?.('ynab_web/services/modal') || null;
    
    return {
      globals,
      hasEmber: !!window.Ember,
      containerFound: !!container,
      requireFound: !!window.require
    };
  });
  console.log('Ember 4200 Debug:', debug);
  await browser.close();
})();
