import { chromium } from 'playwright';

async function inspectStory() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1000);

  await page.click('.navlink-reports a');
  await page.waitForTimeout(500);

  await page.click('button:has-text("Story Matrix")');
  await page.waitForTimeout(500);

  // Click story 3
  await page.click('strong:has-text("Group Drilldown")');
  await page.waitForTimeout(1000);

  // Check what is rendered
  const html = await page.evaluate(() => {
    const el = document.querySelector('.reflect-spending-breakdown');
    return el ? el.outerHTML.substring(0, 500) : 'NOT FOUND';
  });
  console.log('Story 3 HTML preview:', html);

  // Check SVG elements in chart
  const svgInfo = await page.evaluate(() => {
    const bb = document.querySelector('.spending-breakdown-donut-chart__bb');
    if (!bb) return 'No bb container';
    const svg = bb.querySelector('svg');
    if (!svg) return 'No svg in bb';
    const arcs = bb.querySelectorAll('.bb-chart-arc');
    const texts = bb.querySelectorAll('.bb-chart-arc text');
    return {
      svgWidth: svg.getAttribute('width') || svg.clientWidth,
      svgHeight: svg.getAttribute('height') || svg.clientHeight,
      arcsCount: arcs.length,
      textsCount: texts.length,
      textsContent: Array.from(texts).map(t => t.textContent)
    };
  });
  console.log('Story 3 Chart Info:', JSON.stringify(svgInfo, null, 2));

  await browser.close();
}

inspectStory().catch(console.error);
