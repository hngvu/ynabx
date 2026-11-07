import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_budget_live.png' });
  console.log('Saved ember_budget_live.png');
  
  const budgetInfo = await page.evaluate(() => {
    const content = document.querySelector('.content');
    return {
      classes: content?.className,
      children: Array.from(content?.children || []).map(c => ({
        tag: c.tagName,
        className: c.className,
        id: c.id
      }))
    };
  });
  
  console.log(JSON.stringify(budgetInfo, null, 2));
  await browser.close();
})();
