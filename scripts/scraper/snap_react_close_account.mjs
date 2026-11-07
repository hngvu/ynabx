import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(1500);
  
  // Right click on the first account row to trigger onContextMenu -> handleOpenEditAccount
  const row = await page.$('.nav-account-row');
  if (row) {
    await row.click({ button: 'right' });
    await page.waitForTimeout(500);
  }
  
  // Check Edit Account dialog
  let dialog = await page.$('.dialog');
  if (dialog) {
    await dialog.screenshot({ path: 'react_edit_account_crop.png' });
    console.log('Saved react_edit_account_crop.png');
    
    // Click Close Account button to open CloseAccountModal
    const closeBtn = await page.$('.dialog-footer button.destructive');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(500);
      
      const closeDialog = await page.$('.dialog');
      if (closeDialog) {
        await closeDialog.screenshot({ path: 'react_close_account_crop.png' });
        console.log('Saved react_close_account_crop.png');
      }
    }
  }
  
  await browser.close();
})();
