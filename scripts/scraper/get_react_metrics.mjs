import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  const trigger = await page.$('.js-sidebar-nav-menu');
  await trigger.click();
  await page.waitForTimeout(500);
  
  const menuInfo = await page.evaluate(() => {
    const menu = document.querySelector('.menu.ynab-new-settings-menu');
    const triggerEl = document.querySelector('.js-sidebar-nav-menu');
    const sidebar = document.querySelector('.sidebar');
    return {
      triggerRect: triggerEl.getBoundingClientRect(),
      sidebarRect: sidebar.getBoundingClientRect(),
      menuRect: menu.getBoundingClientRect(),
      menuStyle: {
        width: window.getComputedStyle(menu).width,
        minWidth: window.getComputedStyle(menu).minWidth,
        maxWidth: window.getComputedStyle(menu).maxWidth,
        left: menu.style.left,
        top: menu.style.top
      }
    };
  });
  console.log(JSON.stringify(menuInfo, null, 2));
  await browser.close();
})();
