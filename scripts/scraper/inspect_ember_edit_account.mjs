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
  
  const dialog = await page.$('.dialog');
  if (dialog) {
    await dialog.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/ember_edit_account_crop.png' });
    console.log('Saved ember_edit_account_crop.png');
  }
  
  const details = await page.evaluate(() => {
    const dialog = document.querySelector('.dialog');
    const currencyInput = document.querySelector('.ynab-new-currency-input');
    const closeBtn = document.querySelector('.destructive');
    const cancelBtn = document.querySelector('.button-cancel');
    const saveBtn = document.querySelector('.save-account-button');
    return {
      dialogWidth: window.getComputedStyle(dialog).width,
      currencyInputHtml: currencyInput?.outerHTML,
      buttons: {
        close: {
          text: closeBtn?.innerText,
          classes: closeBtn?.className,
          computed: {
            color: window.getComputedStyle(closeBtn).color,
            bg: window.getComputedStyle(closeBtn).backgroundColor,
            height: window.getComputedStyle(closeBtn).height,
            padding: window.getComputedStyle(closeBtn).padding,
          }
        },
        save: {
          text: saveBtn?.innerText,
          classes: saveBtn?.className,
          computed: {
            color: window.getComputedStyle(saveBtn).color,
            bg: window.getComputedStyle(saveBtn).backgroundColor,
            height: window.getComputedStyle(saveBtn).height,
            padding: window.getComputedStyle(saveBtn).padding,
          }
        }
      }
    };
  });
  
  console.log(JSON.stringify(details, null, 2));
  await browser.close();
})();
