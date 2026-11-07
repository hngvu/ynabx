import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(2000);
  
  const trigger = await page.$('.js-sidebar-nav-menu');
  await trigger.click();
  await page.waitForTimeout(1000);
  
  const menuInfo = await page.evaluate(() => {
    const menu = document.querySelector('.menu.ynab-new-settings-menu');
    const sidebar = document.querySelector('.sidebar');
    const triggerEl = document.querySelector('.js-sidebar-nav-menu');
    return {
      sidebarWidth: sidebar.getBoundingClientRect().width,
      triggerWidth: triggerEl.getBoundingClientRect().width,
      menuWidth: menu.getBoundingClientRect().width,
      sidebarRight: sidebar.getBoundingClientRect().right,
      menuRight: menu.getBoundingClientRect().right,
      isMenuWiderThanSidebar: menu.getBoundingClientRect().width > sidebar.getBoundingClientRect().width,
      isMenuProtruding: menu.getBoundingClientRect().right > sidebar.getBoundingClientRect().right
    };
  });
  console.log('Ember menu vs sidebar:', JSON.stringify(menuInfo, null, 2));
  await browser.close();
})();
