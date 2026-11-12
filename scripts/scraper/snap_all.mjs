import { chromium } from 'playwright';
import fs from 'fs';

async function checkAllStoriesVisuals() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1000);
  await page.click('.navlink-reports a');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Story Matrix")');
  await page.waitForTimeout(500);

  const outDir = 'scripts/scraper/all_stories';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Get all story clickable rows
  const storyRows = await page.$$('div[style*="cursor: pointer"] strong');
  console.log(`Found ${storyRows.length} story items to inspect`);

  for (let i = 0; i < storyRows.length; i++) {
    const title = await storyRows[i].innerText();
    console.log(`Snapping Story #${i + 1}: ${title}`);
    await storyRows[i].click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${outDir}/story_${i + 1}.png` });
  }

  await browser.close();
  console.log('Finished capturing all stories!');
}

checkAllStoriesVisuals().catch(console.error);
