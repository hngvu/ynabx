import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  await page.evaluate(() => {
    const appWrapper = window.emberInspectorApps?.[0];
    const realApp = appWrapper?.app;
    const instance = Array.from(realApp?._applicationInstances.values())[0];
    const modalService = instance.lookup('service:modal');
    
    const mockAccount = {
      entityId: 'acc-mock-1',
      accountName: 'Chase Checking',
      accountType: 'checking',
      note: 'My main spending account',
      clearedBalance: 7515870,
      unclearedBalance: 0,
      workingBalance: 7515870,
      isDirectImportLinked: false,
      isDirectImportActive: false,
      isTombstone: false,
      isClosed: false,
      isLoanAccount: false,
      onBudget: true,
      saveChanges: () => Promise.resolve(),
    };
    
    modalService.setDataForModal({
      account: mockAccount,
    });
    modalService.openModal('modals/close-account');
  });
  
  await page.waitForTimeout(1000);
  
  const dialog = await page.$('.dialog');
  if (dialog) {
    await dialog.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_close_account_crop.png' });
    console.log('Saved ember_close_account_crop.png');
  }
  
  await browser.close();
})();
