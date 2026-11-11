import { chromium } from 'playwright';

async function captureSideBySide() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Capture real Ember app on Spending Breakdown
  const emberPage = await context.newPage();
  await emberPage.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/reflect/spending-breakdown', { waitUntil: 'networkidle' });
  await emberPage.waitForTimeout(2000);
  await emberPage.screenshot({ path: '../../clone/artifacts/ember_spending_breakdown_actual.png' });
  console.log('Saved Ember screenshot: ember_spending_breakdown_actual.png');

  // 2. Capture React Clone on Spending Breakdown
  const clonePage = await context.newPage();
  await clonePage.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await clonePage.waitForTimeout(1000);
  const reflectBtn = clonePage.locator('button:has-text("Reflect")').first();
  if (await reflectBtn.isVisible()) {
    await reflectBtn.click();
    await clonePage.waitForTimeout(1000);
  }
  await clonePage.screenshot({ path: '../../clone/artifacts/clone_spending_breakdown_actual.png' });
  console.log('Saved Clone screenshot: clone_spending_breakdown_actual.png');

  await browser.close();
}

captureSideBySide().catch(console.error);
