import { chromium } from 'playwright';
import fs from 'fs';

async function testModalOpen() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/accounts');
  await page.click('.nav-account-row:first-of-type');
  await page.waitForTimeout(500);

  // Click pencil
  await page.click('.accounts-header-edit-account');
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'output/open_account_edit_modal.png' });

  // Look for modal container anywhere in DOM
  const modalHTML = await page.evaluate(() => {
    const modal = document.querySelector('.modal-container, .modal-account-actions, .modal-base, .modal-popup, .modal-content, [role="dialog"], .modal-account-settings');
    if (modal) return modal.outerHTML;
    
    // Check all divs inside .layout
    return Array.from(document.querySelectorAll('.layout > *')).map(e => e.className).join(' | ');
  });

  console.log('Modal HTML / layout children:');
  console.log(modalHTML.slice(0, 1000));
  fs.writeFileSync('output/exact_account_settings_modal.html', modalHTML);

  await browser.close();
}
testModalOpen();
