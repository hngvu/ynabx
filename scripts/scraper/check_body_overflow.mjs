import { chromium } from 'playwright';

async function checkBodyOverflow() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

  const info = await page.evaluate(() => {
    const el = document.getElementById("icon_sprite");
    const svg = el ? el.querySelector("svg") : null;
    return {
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      htmlClientWidth: document.documentElement.clientWidth,
      windowInnerWidth: window.innerWidth,
      divRect: el ? el.getBoundingClientRect() : null,
      svgRect: svg ? svg.getBoundingClientRect() : null,
      hasHScrollbar: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth
    };
  });

  console.log(JSON.stringify(info, null, 2));

  // Also check after navigating to Reflect
  const reflectBtn = page.locator('button:has-text("Reflect")').first();
  if (await reflectBtn.isVisible()) {
    await reflectBtn.click();
    await page.waitForTimeout(1000);
  }

  const infoReflect = await page.evaluate(() => {
    const reflectContainer = document.querySelector('.reflect-container');
    const reflectContent = document.querySelector('.reflect-content');
    const spendingBreakdown = document.querySelector('.reflect-spending-breakdown');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      htmlScrollWidth: document.documentElement.scrollWidth,
      hasHScrollbar: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
      reflectContainer: reflectContainer ? {
        scrollWidth: reflectContainer.scrollWidth,
        clientWidth: reflectContainer.clientWidth,
        hasHScroll: reflectContainer.scrollWidth > reflectContainer.clientWidth
      } : null,
      spendingBreakdown: spendingBreakdown ? {
        scrollWidth: spendingBreakdown.scrollWidth,
        clientWidth: spendingBreakdown.clientWidth,
        hasHScroll: spendingBreakdown.scrollWidth > spendingBreakdown.clientWidth
      } : null
    };
  });

  console.log('On Reflect route:');
  console.log(JSON.stringify(infoReflect, null, 2));

  await browser.close();
}

checkBodyOverflow().catch(console.error);
