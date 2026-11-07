import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  const trigger = await page.$('.js-sidebar-nav-menu');
  if (trigger) {
    await trigger.click();
    await page.waitForTimeout(1000);
    
    const details = await page.evaluate(() => {
      const menu = document.querySelector('.menu.ynab-new-settings-menu');
      if (!menu) return null;
      const computed = window.getComputedStyle(menu);
      const items = Array.from(menu.children).map(c => ({
        tag: c.tagName,
        className: c.className,
        text: c.innerText.trim(),
        role: c.getAttribute('role'),
        computed: {
          padding: window.getComputedStyle(c).padding,
          fontSize: window.getComputedStyle(c).fontSize,
          height: window.getComputedStyle(c).height,
          gap: window.getComputedStyle(c).gap,
          display: window.getComputedStyle(c).display,
        }
      }));
      return {
        menu: {
          width: computed.width,
          minWidth: computed.minWidth,
          maxWidth: computed.maxWidth,
          padding: computed.padding,
          margin: computed.margin,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize,
          rect: menu.getBoundingClientRect()
        },
        items
      };
    });
    console.log(JSON.stringify(details, null, 2));
  }
  
  await browser.close();
})();
