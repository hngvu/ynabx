import { chromium } from 'playwright';

async function inspectSvg() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const reflectBtn = page.locator('button:has-text("Reflect")').first();
  if (await reflectBtn.isVisible()) {
    await reflectBtn.click();
    await page.waitForTimeout(1000);
  }

  const svgInfo = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'));
    return svgs.map(s => {
      const rect = s.getBoundingClientRect();
      return {
        id: s.id,
        className: String(s.className),
        parentClass: s.parentElement ? s.parentElement.className : '',
        rectWidth: rect.width,
        rectRight: rect.right,
        clientWidth: s.clientWidth,
        widthAttr: s.getAttribute('width'),
        viewBox: s.getAttribute('viewBox'),
        style: s.getAttribute('style')
      };
    }).filter(info => info.rectRight > 1440 || info.rectWidth > 800);
  });

  console.log('Offending SVGs:', JSON.stringify(svgInfo, null, 2));

  await browser.close();
}

inspectSvg().catch(console.error);
