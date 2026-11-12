import { chromium } from 'playwright';

async function inspectHtml() {
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

  const inner = await page.$$eval('.bb-chart-arc text', els => els.map(e => ({
    html: e.outerHTML,
    transform: e.getAttribute('transform'),
    style: e.getAttribute('style')
  })));
  console.log('Texts details:', JSON.stringify(inner.slice(0, 4), null, 2));
  await browser.close();
}

inspectHtml().catch(console.error);
