import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  const trigger = await page.$('.js-sidebar-nav-menu');
  await trigger.click();
  await page.waitForTimeout(500);
  
  const labels = await page.evaluate(() => {
    const items = document.querySelectorAll('.menu [role="menuitem"]');
    return Array.from(items).map(item => ({
      text: item.innerText.split('\n')[0],
      scrollWidth: item.scrollWidth,
      clientWidth: item.clientWidth,
      isEllipsis: item.scrollWidth > item.clientWidth
    }));
  });
  console.log(labels);
  await browser.close();
})();
