import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  const inspectorHtml = await page.evaluate(() => {
    return document.querySelector('.budget-inspector-content')?.outerHTML;
  });
  
  console.log(inspectorHtml);
  await browser.close();
})();
