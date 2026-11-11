import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const outDir = path.resolve('../../clone/artifacts');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Navigating to Ember app at http://localhost:4200 ...');
  const emberPage = await context.newPage();
  try {
    await emberPage.goto('http://localhost:4200', { waitUntil: 'networkidle', timeout: 15000 });
    await emberPage.waitForTimeout(2000);

    const reflectLink = emberPage.locator('a[href*="reflect"], button:has-text("Reflect")').first();
    if (await reflectLink.isVisible()) {
      await reflectLink.click();
      await emberPage.waitForTimeout(2000);
    }

    const emberSpendingPath = path.join(outDir, 'ember_spending_breakdown.png');
    await emberPage.screenshot({ path: emberSpendingPath });
    console.log('Captured Ember Spending Breakdown:', emberSpendingPath);
  } catch (err) {
    console.error('Error with Ember page:', err.message);
  }

  console.log('Navigating to React Clone at http://localhost:5174 ...');
  const clonePage = await context.newPage();
  try {
    await clonePage.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 15000 });
    await clonePage.waitForTimeout(1000);

    const cloneReflectBtn = clonePage.locator('button:has-text("Reflect")').first();
    if (await cloneReflectBtn.isVisible()) {
      await cloneReflectBtn.click();
      await clonePage.waitForTimeout(1000);
    }

    const cloneSpendingPath = path.join(outDir, 'clone_spending_breakdown.png');
    await clonePage.screenshot({ path: cloneSpendingPath });
    console.log('Captured Clone Spending Breakdown:', cloneSpendingPath);

    // Story Matrix
    console.log('Capturing Story Matrix on React Clone (?story=1)...');
    await clonePage.goto('http://localhost:5174/?story=1', { waitUntil: 'networkidle', timeout: 15000 });
    await clonePage.waitForTimeout(1000);
    const storyMatrixPath = path.join(outDir, 'clone_reflect_story_matrix.png');
    await clonePage.screenshot({ path: storyMatrixPath });
    console.log('Captured Story Matrix:', storyMatrixPath);
  } catch (err) {
    console.error('Error with Clone page:', err.message);
  }

  await browser.close();
  console.log('Capture finished successfully!');
}

capture().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
