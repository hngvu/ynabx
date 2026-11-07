import { chromium } from 'playwright';
import fs from 'fs';

async function testClickHeaderPencil() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  // Go directly to accounts page
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/accounts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Click on Chase Checking in sidebar
  await page.click('.nav-account-row:first-of-type');
  await page.waitForTimeout(500);

  // Look for .accounts-header-edit-account
  console.log('Looking for .accounts-header-edit-account...');
  const pencil = await page.$('.accounts-header-edit-account');
  console.log('Found pencil?', !!pencil);

  if (pencil) {
    await pencil.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'output/exact_account_settings_modal.png' });
    
    // Dump full page or modal DOM
    const modalHTML = await page.evaluate(() => {
      const modal = document.querySelector('.modal-container, .modal-account-actions, .modal-base, .modal-overlay, .modal-content, [class*="modal"]');
      return modal ? modal.outerHTML : '';
    });
    console.log('Modal HTML length:', modalHTML.length);
    fs.writeFileSync('output/exact_account_settings_modal.html', modalHTML);

    const bodyChildren = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('body > *')).map(el => ({
        tag: el.tagName,
        className: el.className
      }));
    });
    console.log('Body direct children:', bodyChildren);
  }

  await browser.close();
}
testClickHeaderPencil();
