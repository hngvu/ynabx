import { chromium } from './node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForSelector('.to-be-budgeted', { timeout: 10000 });
  
  // Set leftToBudget > 0 in Ember to inspect positive state
  const positiveState = await page.evaluate(() => {
    // find Ember application / budget service
    const tbb = document.querySelector('.to-be-budgeted');
    return tbb ? tbb.className : null;
  });
  console.log('Class:', positiveState);
  await browser.close();
})();
