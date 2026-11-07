import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  const structure = await page.evaluate(() => {
    const main = document.querySelector('.content-min-break');
    return {
      classes: main?.className,
      html: main?.innerHTML,
    };
  });
  
  fs.writeFileSync('scripts/scraper/output/budget_live_dom.html', structure.html);
  console.log('Saved budget_live_dom.html, size:', structure.html.length);
  await browser.close();
})();
