import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // Inject trial banner to see how width reacts
  await page.evaluate(() => {
    const trigger = document.querySelector('.js-sidebar-nav-menu');
    if (trigger) trigger.click();
  });
  await page.waitForTimeout(500);
  
  await page.evaluate(() => {
    const menu = document.querySelector('.menu.ynab-new-settings-menu');
    if (menu) {
      const banner = document.createElement('div');
      banner.className = 'trial-days-left positive';
      banner.innerHTML = 'There are <strong>34 days</strong> left on your trial. <a href="#">Subscribe now.</a>';
      menu.prepend(banner);
    }
  });
  await page.waitForTimeout(500);
  
  const info = await page.evaluate(() => {
    const menu = document.querySelector('.menu.ynab-new-settings-menu');
    const banner = document.querySelector('.trial-days-left');
    return {
      menuWidth: menu.getBoundingClientRect().width,
      bannerWidth: banner ? banner.getBoundingClientRect().width : null,
      scrollWidth: menu.scrollWidth,
      clientWidth: menu.clientWidth
    };
  });
  console.log('Menu info with trial banner:', info);
  await page.screenshot({ path: '../../menu_with_banner_test.png' });
  await browser.close();
})();
