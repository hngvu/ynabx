import { chromium } from 'playwright';

async function findOverflowX() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate to Reflect
  const reflectBtn = page.locator('button:has-text("Reflect")').first();
  if (await reflectBtn.isVisible()) {
    await reflectBtn.click();
    await page.waitForTimeout(1000);
  }

  // Find all elements where scrollWidth > clientWidth
  const overflowingElements = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const results = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
        results.push({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          overflowX: getComputedStyle(el).overflowX
        });
      }
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 2) {
        results.push({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          rectRight: rect.right,
          docWidth,
          type: 'EXCEEDS_RIGHT'
        });
      }
    }
    return results;
  });

  console.log('Overflowing elements:');
  console.log(JSON.stringify(overflowingElements.slice(0, 15), null, 2));

  await browser.close();
}

findOverflowX().catch(console.error);
