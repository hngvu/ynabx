import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  const res = await page.evaluate(() => {
    const app = window.emberInspectorApps?.[0];
    const protoProps = Object.getOwnPropertyNames(Object.getPrototypeOf(app) || {});
    const ownProps = Object.getOwnPropertyNames(app || {});
    return { ownProps, protoProps };
  });
  console.log('App inspection:', res);
  await browser.close();
})();
