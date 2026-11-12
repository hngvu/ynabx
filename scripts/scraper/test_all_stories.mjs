import { chromium } from 'playwright';

async function testAllStories() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('pageerror', err => {
    errors.push({ error: err.message, stack: err.stack });
    console.error('PAGE ERROR:', err.message);
  });

  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1000);

  await page.click('.navlink-reports a');
  await page.waitForTimeout(500);

  await page.click('button:has-text("Story Matrix")');
  await page.waitForTimeout(500);

  // Get all story item elements in the sidebar
  const items = await page.$$('strong');
  console.log('Found strong elements:', items.length);
  const titles = [];
  for (const item of items) {
    const text = await item.innerText();
    if (text && !text.includes('Story Matrix') && !text.includes('Total') && !text.includes('$')) {
      titles.push(text);
    }
  }

  console.log(`Found story titles:`, titles);

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    console.log(`\n--- Clicking Story #${i + 1}: "${title}" ---`);
    await page.click(`strong:has-text("${title}")`);
    await page.waitForTimeout(500);

    // Take screenshot of this story
    await page.screenshot({ path: `scripts/scraper/story_${i + 1}.png` });

    if (errors.length > 0) {
      console.error(`Caught error on story #${i + 1}:`, errors[errors.length - 1]);
    } else {
      console.log(`Story #${i + 1} loaded with no errors.`);
    }
  }

  console.log('\n--- Clicking "All Stacked" mode ---');
  await page.click('button:has-text("All Stacked")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `scripts/scraper/story_all_stacked.png` });
  console.log(`All Stacked completed. Total errors caught: ${errors.length}`);

  await browser.close();
}

testAllStories().catch(console.error);
