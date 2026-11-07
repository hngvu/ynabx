import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  const collapseBtn = await page.$('.sidebar-collapse');
  if (collapseBtn) {
    await collapseBtn.click();
    await page.waitForTimeout(500);
    
    const collapsedTrigger = await page.$('.sidebar-nav-menu-collapsed');
    if (collapsedTrigger) {
      await collapsedTrigger.click();
      await page.waitForTimeout(500);
      
      const info = await page.evaluate(() => {
        const menu = document.querySelector('.menu.ynab-new-settings-menu');
        const sidebar = document.querySelector('.sidebar');
        return {
          sidebarWidth: sidebar.getBoundingClientRect().width,
          menuWidth: menu ? menu.getBoundingClientRect().width : null,
          menuLeft: menu ? menu.getBoundingClientRect().left : null,
          menuRight: menu ? menu.getBoundingClientRect().right : null,
        };
      });
      console.log('When collapsed:', info);
      await page.screenshot({ path: '../../react_menu_collapsed.png' });
    }
  }
  await browser.close();
})();
