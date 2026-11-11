import { chromium } from 'playwright';
import fs from 'fs';

async function dumpFilledSpending() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/reflect/spending-breakdown', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click the left arrow in timeframe to move from Nov 2026 to Oct 2026
  console.log('Clicking left arrow to go to Oct 2026...');
  const leftArrow = page.locator('.filter-button__left-arrow').first();
  await leftArrow.click();
  await page.waitForTimeout(2000);

  // Take screenshot with transactions!
  await page.screenshot({ path: '../../clone/artifacts/ember_spending_october_real.png' });
  console.log('Saved Ember Oct 2026 screenshot to clone/artifacts/ember_spending_october_real.png');

  // Dump DOM
  const octDom = await page.locator('.reflect-content').first().innerHTML();
  fs.writeFileSync('../../clone/artifacts/ember_spending_october_dom.html', octDom, 'utf8');
  console.log('Saved Oct 2026 DOM, length:', octDom.length);

  await browser.close();
}

dumpFilledSpending().catch(console.error);
