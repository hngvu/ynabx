import { chromium } from 'playwright';

async function identifyOffender() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const reflectBtn = page.locator('button:has-text("Reflect")').first();
  if (await reflectBtn.isVisible()) {
    await reflectBtn.click();
    await page.waitForTimeout(1000);
  }

  const details = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'));
    return svgs.map((s, idx) => {
      const rect = s.getBoundingClientRect();
      let parent = s.parentElement;
      const chain = [];
      while (parent && parent !== document.body) {
        chain.push(parent.tagName + (parent.className ? '.' + parent.className : ''));
        parent = parent.parentElement;
      }
      return {
        idx,
        rectRight: rect.right,
        rectWidth: rect.width,
        outerHTMLPreview: s.outerHTML.slice(0, 120),
        parents: chain.slice(0, 4)
      };
    }).filter(s => s.rectRight > 1440);
  });

  console.log('Offending SVG detail:');
  console.log(JSON.stringify(details, null, 2));

  await browser.close();
}

identifyOffender().catch(console.error);
