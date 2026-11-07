import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1500);
  
  // Right click on the first account row to trigger onContextMenu -> handleOpenEditAccount
  const row = await page.$('.nav-account-row');
  console.log('Row found:', !!row);
  if (row) {
    await row.click({ button: 'right' });
    await page.waitForTimeout(500);
  }
  
  const dialog = await page.$('.dialog');
  console.log('Dialog opened:', !!dialog);
  
  if (dialog) {
    await page.screenshot({ path: 'react_edit_account_opened.png' });
    await dialog.screenshot({ path: 'react_edit_account_crop.png' });
    console.log('Screenshots saved!');
  }
  
  await browser.close();
})();
