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
      editAccountModalSource: 'sidebar',
    });
    modalService.openModal('modals/edit-account');
  });
  
  await page.waitForTimeout(1000);
  
  const dom = await page.evaluate(() => {
    const modal = document.querySelector('.modal-popup.account-modal, .dialog');
    return {
      classes: modal?.className,
      html: modal?.outerHTML,
      computed: {
        width: window.getComputedStyle(modal).width,
        maxWidth: window.getComputedStyle(modal).maxWidth,
        padding: window.getComputedStyle(modal).padding,
        borderRadius: window.getComputedStyle(modal).borderRadius,
      }
    };
  });
  
  console.log('DOM Info:', JSON.stringify(dom, null, 2));
  await browser.close();
})();
