import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  const res = await page.evaluate(() => {
    try {
      const appWrapper = window.emberInspectorApps?.[0];
      const realApp = appWrapper?.app;
      const instance = Array.from(realApp?._applicationInstances.values())[0];
      
      const accountsService = instance.lookup('service:accounts');
      const modalService = instance.lookup('service:modal');
      
      // Let's create an account mock object like what sidebarViewModel.getAccountCloneForEditing returns
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
        editAccountModalSource: 'sidebar',
      });
      modalService.openModal('modals/edit-account');
      return { success: true };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });
  console.log('Open edit-account on 4200:', res);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_edit_account_4200.png' });
  await browser.close();
})();
