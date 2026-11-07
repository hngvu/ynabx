import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.width = '190px';
  });
  
  const trigger = await page.$('.js-sidebar-nav-menu');
  await trigger.click();
  await page.waitForTimeout(500);
  
  const info = await page.evaluate(() => {
    const menu = document.querySelector('.menu.ynab-new-settings-menu');
    const sidebar = document.querySelector('.sidebar');
    const triggerEl = document.querySelector('.js-sidebar-nav-menu');
    return {
      sidebarWidth: sidebar.getBoundingClientRect().width,
      triggerWidth: triggerEl.getBoundingClientRect().width,
      menuWidth: menu.getBoundingClientRect().width,
      menuRect: menu.getBoundingClientRect(),
      scrollWidth: menu.scrollWidth,
    };
  });
  console.log('Result when sidebar is 190px:', info);
  await page.screenshot({ path: '../../sidebar_190_test.png' });
  await browser.close();
})();
