import { chromium } from 'playwright';
import fs from 'fs';

async function testClickMenuItems() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget', { waitUntil: 'networkidle' });

  const items = [
    { name: 'Plan Settings', selector: '.modal-select-budget-settings' },
    { name: 'Manage Payees', selector: '.modal-select-budget-manage-payees' },
    { name: 'Edit Flags', selector: '.modal-select-budget-flag-names' },
    { name: 'Display Options', selector: '.modal-select-theme-switcher' },
    { name: 'Export Plan', selector: '.modal-select-budget-export' },
    { name: 'Make a Fresh Start', selector: '.modal-select-budget-fresh-start' },
    { name: 'Manage Bank Connections', selector: '.modal-select-budget-manage-connections' },
    { name: 'Keyboard Shortcuts', selector: '.modal-select-budget-keyboard-shortcuts' }
  ];

  for (const item of items) {
    console.log(`\n=== Testing click: ${item.name} ===`);
    // Open menu
    await page.click('button.sidebar-nav-menu-budget');
    await page.waitForTimeout(300);

    const btn = await page.$(item.selector);
    if (!btn) {
      console.log(`Button ${item.selector} not found`);
      continue;
    }
    await btn.click();
    await page.waitForTimeout(600);

    // Look for new modal/dialog/popover
    const popupInfo = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.dialog, .modal-popup, .modal-overlay, [role="dialog"], .ynab-new-theme-switcher, .modal-manage-payees, .modal-budget-settings'));
      return els.map(e => ({
        class: e.className,
        role: e.getAttribute('role'),
        html: e.outerHTML.slice(0, 400)
      }));
    });
    console.log(`Results for ${item.name}:`, popupInfo.length ? popupInfo : 'None');

    // Save screenshot
    const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await page.screenshot({ path: `output/menu_click_${cleanName}.png` });

    // Save outerHTML if modal found
    if (popupInfo.length > 0) {
      const fullHtml = await page.evaluate(() => {
        const dialog = document.querySelector('.dialog-overlay, .modal-popup, [role="dialog"], .menu');
        return dialog ? dialog.outerHTML : '';
      });
      fs.writeFileSync(`output/menu_modal_${cleanName}.html`, fullHtml);
    }

    // Close any dialog by escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  await browser.close();
}
testClickMenuItems();
