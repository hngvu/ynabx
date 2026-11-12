import { chromium } from 'playwright';

async function snapStory3() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1000);
  await page.click('.navlink-reports a');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Story Matrix")');
  await page.waitForTimeout(500);
  await page.click('strong:has-text("Group Drilldown")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scripts/scraper/story_3_fixed.png' });
  await browser.close();
  console.log('Saved story_3_fixed.png');
}

snapStory3().catch(console.error);
