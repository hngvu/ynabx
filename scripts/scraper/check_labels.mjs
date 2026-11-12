import { chromium } from 'playwright';

async function checkLabels() {
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

  const texts = await page.$$eval('.bb-chart-arc text', els => els.map(e => ({
    display: window.getComputedStyle(e).display,
    visibility: window.getComputedStyle(e).visibility,
    opacity: window.getComputedStyle(e).opacity,
    text: e.textContent,
    fill: window.getComputedStyle(e).fill,
    transform: e.getAttribute('transform'),
    bbox: e.getBoundingClientRect()
  })));
  console.log('Texts:', JSON.stringify(texts, null, 2));
  await browser.close();
}

checkLabels().catch(console.error);
