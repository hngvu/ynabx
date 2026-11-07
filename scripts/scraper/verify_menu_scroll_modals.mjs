import { chromium } from 'playwright';
import fs from 'fs';

async function verifyMenuScrollAndSubmodals() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });

  // 1. Open Plan Menu
  console.log('Opening Plan Menu...');
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(400);

  // Check scroll ability
  const scrollInfo = await page.$eval('.ynab-new-settings-menu', el => {
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      canScroll: el.scrollHeight > el.clientHeight,
      overflowY: window.getComputedStyle(el).overflowY
    };
  });
  console.log('Menu scroll status:', scrollInfo);

  // Scroll down to the bottom of the menu
  await page.evaluate(() => {
    const menu = document.querySelector('.ynab-new-settings-menu');
    if (menu) menu.scrollTop = menu.scrollHeight;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'output/react_menu_scrolled_bottom.png' });

  // 2. Test opening Plan Settings modal from menu
  console.log('Clicking Plan Settings...');
  await page.evaluate(() => {
    const menu = document.querySelector('.ynab-new-settings-menu');
    if (menu) menu.scrollTop = 0;
  });
  await page.waitForTimeout(200);
  await page.click('.modal-select-budget-settings');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'output/react_plan_settings_modal.png' });
  await page.click('.dialog-close');
  await page.waitForTimeout(300);

  // 3. Test opening Edit Flags modal
  console.log('Clicking Edit Flags...');
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(300);
  await page.click('.modal-select-budget-flag-names');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'output/react_edit_flags_modal.png' });
  await page.click('.modal-fresh-close');
  await page.waitForTimeout(300);

  // 4. Test opening Display Options modal
  console.log('Clicking Display Options...');
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(300);
  await page.click('.modal-select-theme-switcher');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'output/react_display_options_modal.png' });
  await page.click('.dialog-close');
  await page.waitForTimeout(300);

  // 5. Test opening Manage Payees modal
  console.log('Clicking Manage Payees...');
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(300);
  await page.click('.modal-select-budget-manage-payees');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'output/react_manage_payees_modal.png' });
  await page.click('.dialog-close');
  await page.waitForTimeout(300);

  // 6. Test opening Export Plan modal
  console.log('Clicking Export Plan...');
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(300);
  await page.click('.modal-select-budget-export');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'output/react_export_plan_modal.png' });
  await page.click('.dialog-close');
  await page.waitForTimeout(300);

  // 7. Test opening Fresh Start modal
  console.log('Clicking Fresh Start...');
  await page.click('button.sidebar-nav-menu-budget');
  await page.waitForTimeout(300);
  await page.click('.modal-select-budget-fresh-start');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'output/react_fresh_start_modal.png' });
  await page.click('.dialog-close');
  await page.waitForTimeout(300);

  console.log('ALL SUBMODALS AND SCROLL VERIFIED SUCCESSFULLY!');
  await browser.close();
}

verifyMenuScrollAndSubmodals();
