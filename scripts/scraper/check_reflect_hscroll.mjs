import { chromium } from 'playwright';

async function checkReflectHScroll() {
  const browser = await chromium.launch({ headless: true });
  
  for (const width of [1440, 1280, 1100, 1000]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Click the Reflect anchor
    const reflectLink = page.locator('a[href="#reflect"]').first();
    await reflectLink.click();
    await page.waitForTimeout(800);

    const report = await page.evaluate((w) => {
      const reflectContainer = document.querySelector('.reflect-container');
      const spendingBreakdown = document.querySelector('.reflect-spending-breakdown');
      const content = document.querySelector('.spending-breakdown__content');
      const body = document.body;
      const html = document.documentElement;

      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
          const style = getComputedStyle(el);
          if (style.overflowX !== 'hidden' && style.overflowX !== 'clip') {
            overflowing.push({
              tag: el.tagName,
              className: el.className,
              clientWidth: el.clientWidth,
              scrollWidth: el.scrollWidth,
              diff: el.scrollWidth - el.clientWidth,
              overflowX: style.overflowX
            });
          }
        }
      });

      return {
        viewportWidth: w,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        htmlScrollWidth: html.scrollWidth,
        htmlClientWidth: html.clientWidth,
        hasBodyHScroll: body.scrollWidth > body.clientWidth,
        reflectContainer: reflectContainer ? {
          clientWidth: reflectContainer.clientWidth,
          scrollWidth: reflectContainer.scrollWidth,
          diff: reflectContainer.scrollWidth - reflectContainer.clientWidth,
          overflowX: getComputedStyle(reflectContainer).overflowX
        } : null,
        spendingBreakdown: spendingBreakdown ? {
          clientWidth: spendingBreakdown.clientWidth,
          scrollWidth: spendingBreakdown.scrollWidth,
          diff: spendingBreakdown.scrollWidth - spendingBreakdown.clientWidth,
          overflowX: getComputedStyle(spendingBreakdown).overflowX
        } : null,
        overflowing
      };
    }, width);

    console.log(`\n=== Viewport ${width}px ===`);
    console.log(JSON.stringify(report, null, 2));
    await page.close();
  }

  await browser.close();
}

checkReflectHScroll().catch(console.error);
