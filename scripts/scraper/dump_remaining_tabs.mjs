import { chromium } from 'playwright';
import fs from 'fs';

async function dumpAllTabs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const baseUrl = 'http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/reflect';
  const tabs = [
    { id: 'spending-trends', url: `${baseUrl}/spending-trends` },
    { id: 'net-worth', url: `${baseUrl}/net-worth` },
    { id: 'income-expense', url: `${baseUrl}/income-expense` },
    { id: 'age-of-money', url: `${baseUrl}/age-of-money` }
  ];

  for (const tab of tabs) {
    console.log(`Navigating to ${tab.id} at ${tab.url} ...`);
    await page.goto(tab.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `../../clone/artifacts/ember_${tab.id}_actual.png` });
    console.log(`Saved screenshot: ember_${tab.id}_actual.png`);

    const dom = await page.locator('.reflect-content, .scroll-wrap.content').first().innerHTML().catch(() => 'NOT_FOUND');
    fs.writeFileSync(`../../clone/artifacts/ember_${tab.id}_dom.html`, dom, 'utf8');
    console.log(`Saved DOM: ember_${tab.id}_dom.html (${dom.length} chars)`);
  }

  await browser.close();
  console.log('Finished dumping all tabs!');
}

dumpAllTabs().catch(console.error);
