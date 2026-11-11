import { chromium } from 'playwright';

async function checkReflectNav() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click nav item Reflect
  console.log('Locating nav links in Clone sidebar:');
  const navItems = await page.locator('.sidebar-nav-item, button, a').all();
  for (const item of navItems) {
    const text = (await item.innerText().catch(() => '')).trim();
    if (text === 'Reflect') {
      console.log('Found button Reflect! Clicking...');
      await item.click();
      break;
    }
  }
  await page.waitForTimeout(1500);

  const overflowReport = await page.evaluate(() => {
    const results = [];
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
        results.push({
          tag: el.tagName,
          className: el.className,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          overflowX: getComputedStyle(el).overflowX
        });
      }
    }
    return results;
  });

  console.log('All elements with scrollWidth > clientWidth:');
  console.log(JSON.stringify(overflowReport, null, 2));

  await browser.close();
}

checkReflectNav().catch(console.error);
