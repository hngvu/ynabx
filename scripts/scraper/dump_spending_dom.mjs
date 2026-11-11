import { chromium } from 'playwright';
import fs from 'fs';

async function dumpDom() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/reflect/spending-breakdown', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const reflectContent = await page.locator('.reflect-content, .scroll-wrap.content').first().innerHTML();
  fs.writeFileSync('../../clone/artifacts/ember_spending_breakdown_dom.html', reflectContent, 'utf8');
  console.log('Saved Ember Spending Breakdown DOM, length:', reflectContent.length);

  await browser.close();
}

dumpDom().catch(console.error);
