import { chromium } from 'playwright';

async function checkReflectExact() {
  const browser = await chromium.launch({ headless: true });
  
  for (const width of [1440, 1280, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Click Reflect
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const r = btns.find(b => b.textContent.trim() === 'Reflect');
      if (r) r.click();
    });
    await page.waitForTimeout(800);

    const check = await page.evaluate(() => {
      const rc = document.querySelector('.reflect-container');
      const sb = document.querySelector('.reflect-spending-breakdown');
      const sbc = document.querySelector('.spending-breakdown__content');
      return {
        url: window.location.href,
        hasReflect: !!rc,
        rc: rc ? {
          clientWidth: rc.clientWidth,
          scrollWidth: rc.scrollWidth,
          hasHScroll: rc.scrollWidth > rc.clientWidth
        } : null,
        sb: sb ? {
          clientWidth: sb.clientWidth,
          scrollWidth: sb.scrollWidth,
          hasHScroll: sb.scrollWidth > sb.clientWidth
        } : null,
        sbc: sbc ? {
          clientWidth: sbc.clientWidth,
          scrollWidth: sbc.scrollWidth,
          hasHScroll: sbc.scrollWidth > sbc.clientWidth
        } : null,
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth
      };
    });

    console.log(`Width ${width}:`, JSON.stringify(check, null, 2));
    await page.close();
  }

  await browser.close();
}

checkReflectExact().catch(console.error);
