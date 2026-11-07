import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  const structure = await page.evaluate(() => {
    function summarize(el, depth = 0) {
      if (!el || depth > 3) return null;
      return {
        tag: el.tagName.toLowerCase(),
        classes: el.className,
        id: el.id,
        children: Array.from(el.children).map(c => summarize(c, depth + 1)).filter(Boolean)
      };
    }
    
    return summarize(document.querySelector('.content-min-break'));
  });
  
  console.log(JSON.stringify(structure, null, 2));
  await browser.close();
})();
