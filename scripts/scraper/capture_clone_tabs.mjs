import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const baseUrl = 'http://localhost:5174';
  const outDir = 'C:/Users/hoang/.gemini/antigravity/brain/b4457154-f770-435f-a846-b00e95f7d9f0';

  console.log('Navigating to clone app at:', baseUrl);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click on Reflect in sidebar: .navlink-reports a
  console.log('Clicking on Reflect link...');
  const reflectLink = await page.waitForSelector('.navlink-reports a');
  await reflectLink.click();
  await page.waitForTimeout(1500);

  // Tabs to test
  const tabs = [
    { name: 'spending-breakdown', text: 'Spending Breakdown' },
    { name: 'spending-trends', text: 'Spending Trends' },
    { name: 'net-worth', text: 'Net Worth' },
    { name: 'income-expense', text: 'Income v Expense' },
    { name: 'age-of-money', text: 'Age of Money' }
  ];

  for (const t of tabs) {
    console.log(`Switching to tab: ${t.text}`);
    const tabBtn = await page.waitForSelector(`.reports-header button:has-text("${t.text}")`);
    await tabBtn.click();
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(outDir, `clone_reflect_${t.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);
  }

  // Open Story Matrix
  console.log('Opening Reflect Story Matrix...');
  const storyBtn = await page.$('button:has-text("Story Matrix")');
  if (storyBtn) {
    await storyBtn.click();
    await page.waitForTimeout(1000);
    const matrixScreenshot = path.join(outDir, 'clone_reflect_story_matrix_full.png');
    await page.screenshot({ path: matrixScreenshot });
    console.log(`Saved story matrix: ${matrixScreenshot}`);
  }

  await browser.close();
  console.log('ALL DONE! All 5 reflect tab screenshots captured.');
})();
