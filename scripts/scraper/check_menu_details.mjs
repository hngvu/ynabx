import { chromium } from 'playwright';

async function checkEmberMenuScroll() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget', { waitUntil: 'networkidle' });
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(500);

  const style = await page.$eval('.ynab-new-settings-menu', el => {
    const s = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      overflow: s.overflow,
      overflowY: s.overflowY,
      maxHeight: s.maxHeight,
      height: s.height,
      position: s.position,
      top: s.top,
      bottom: s.bottom,
      styleAttr: el.getAttribute('style'),
      rect
    };
  });
  console.log('Ember menu scroll styles:', JSON.stringify(style, null, 2));

  // Also check what items in the menu open submenus / modals when clicked
  const menuButtons = await page.$$eval('.ynab-new-settings-menu button, .ynab-new-settings-menu a', items => {
    return items.map(it => ({
      class: it.className,
      text: it.innerText.trim(),
      id: it.id
    }));
  });
  console.log('Menu buttons count:', menuButtons.length);
  console.log(JSON.stringify(menuButtons, null, 2));

  await browser.close();
}
checkEmberMenuScroll();
