import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  const debugInfo = await page.evaluate(() => {
    return {
      title: document.title,
      htmlLength: document.body.innerHTML.length,
      hasEmber: typeof window.Ember !== 'undefined',
      globals: Object.keys(window).filter(k => k.toLowerCase().includes('ynab') || k.toLowerCase().includes('ember')),
      emberViews: document.querySelectorAll('.ember-view').length,
      firstClasses: document.body.className
    };
  });
  console.log('Debug info:', debugInfo);
  await browser.close();
})();
