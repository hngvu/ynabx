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
    const appService = instance.lookup('service:application');
    if (appService && !appService.sidebarViewModel) {
      appService.sidebarViewModel = { budgetName: "ops's Plan" };
    }
    const modalService = instance.lookup('service:modal');
    modalService.setDataForModal({ isCreate: false });
    modalService.openModal('modals/settings');
  });
  
  await page.waitForTimeout(1000);
  
  const domInfo = await page.evaluate(() => {
    const dialog = document.querySelector('.dialog');
    const header = document.querySelector('.dialog-header');
    const body = document.querySelector('.dialog-body');
    const footer = document.querySelector('.dialog-footer');
    const input = document.querySelector('.modal-settings-budget-name');
    const selects = Array.from(document.querySelectorAll('.x-select-container select')).map(s => ({
      id: s.id,
      className: s.className,
      value: s.value,
      optionsCount: s.options.length,
      firstOption: s.options[0]?.text,
      computed: {
        height: window.getComputedStyle(s).height,
        padding: window.getComputedStyle(s).padding,
        fontSize: window.getComputedStyle(s).fontSize,
        border: window.getComputedStyle(s).border,
        borderRadius: window.getComputedStyle(s).borderRadius,
      }
    }));
    
    return {
      dialogClasses: dialog?.className,
      dialogComputed: {
        width: window.getComputedStyle(dialog).width,
        maxWidth: window.getComputedStyle(dialog).maxWidth,
        padding: window.getComputedStyle(dialog).padding,
        borderRadius: window.getComputedStyle(dialog).borderRadius,
        boxShadow: window.getComputedStyle(dialog).boxShadow,
      },
      headerHtml: header?.outerHTML,
      bodyHtml: body?.outerHTML,
      footerHtml: footer?.outerHTML,
      selects
    };
  });
  
  console.log('DOM Info:', JSON.stringify(domInfo, null, 2));
  await browser.close();
})();
