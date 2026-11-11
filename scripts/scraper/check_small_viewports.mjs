import { chromium } from 'playwright';

async function checkSmallViewports() {
  const browser = await chromium.launch({ headless: true });
  
  for (const width of [1280, 1100, 1024, 900]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const reflectItem = page.locator('button:has-text("Reflect")').first();
    if (await reflectItem.isVisible()) {
      await reflectItem.click();
      await page.waitForTimeout(500);
    }

    const report = await page.evaluate((w) => {
      const results = [];
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.scrollWidth > el.clientWidth && el.clientWidth > 0 && getComputedStyle(el).overflowX !== 'hidden') {
          results.push({
            tag: el.tagName,
            className: el.className,
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            overflowX: getComputedStyle(el).overflowX
          });
        }
      }
      return {
        viewportWidth: w,
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
        hasDocHScroll: document.documentElement.scrollWidth > w,
        overflowing: results
      };
    }, width);

    console.log(`Viewport ${width}px:`, JSON.stringify(report, null, 2));
    await page.close();
  }

  await browser.close();
}

checkSmallViewports().catch(console.error);
