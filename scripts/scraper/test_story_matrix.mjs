import { chromium } from 'playwright';

async function testStories() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('UNCAUGHT PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1000);

  // Click reflect
  await page.click('.navlink-reports a');
  await page.waitForTimeout(500);

  // Click Story Matrix button
  const matrixBtn = await page.$('button:has-text("Story Matrix")');
  if (!matrixBtn) {
    console.log('Matrix button not found!');
    await browser.close();
    return;
  }
  await matrixBtn.click();
  await page.waitForTimeout(500);

  // Find all story items in sidebar
  const storyItems = await page.$$('.story-item, div[style*="cursor: pointer"]');
  console.log(`Found ${storyItems.length} story items or clickable elements`);

  // Let's get the story titles by querying the text inside the sidebar
  const titles = await page.$$eval('div[style*="border-bottom: 1px solid rgb(240, 242, 245)"]', els => els.map(e => e.innerText));
  console.log('Story elements found:', titles.length);

  for (let i = 0; i < titles.length; i++) {
    const el = (await page.$$('div[style*="border-bottom: 1px solid rgb(240, 242, 245)"]'))[i];
    if (el) {
      console.log(`Testing story ${i + 1}: ${titles[i].split('\n')[0]}`);
      await el.click();
      await page.waitForTimeout(500);
      // Check if .reports-error or blank or exception
      const errorText = await page.evaluate(() => {
        const body = document.body.innerText;
        if (body.includes('Something went wrong') || body.includes('Cannot read') || body.includes('undefined')) {
          return body.substring(0, 300);
        }
        return null;
      });
      if (errorText) {
        console.log(`  -> ERROR DETECTED in story ${i + 1}:`, errorText);
      } else {
        console.log(`  -> Story ${i + 1} OK`);
      }
    }
  }

  await browser.close();
}

testStories().catch(console.error);
