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
  
  const styles = await page.evaluate(() => {
    const input = document.querySelector('#modal-settings-budget-name');
    const select = document.querySelector('#modal-settings-currency');
    const selectContainer = document.querySelector('.x-select-container');
    const label = document.querySelector('label.type-body-bold');
    const dialogHeader = document.querySelector('.dialog-header');
    const dialogBody = document.querySelector('.dialog-body');
    const dialogFooter = document.querySelector('.dialog-footer');
    
    function pick(cs) {
      return {
        width: cs.width,
        height: cs.height,
        margin: cs.margin,
        padding: cs.padding,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily,
        lineHeight: cs.lineHeight,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        border: cs.border,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        outline: cs.outline
      };
    }
    
    return {
      input: pick(window.getComputedStyle(input)),
      select: pick(window.getComputedStyle(select)),
      selectContainer: {
        width: window.getComputedStyle(selectContainer).width,
        display: window.getComputedStyle(selectContainer).display,
        margin: window.getComputedStyle(selectContainer).margin,
        position: window.getComputedStyle(selectContainer).position,
      },
      label: pick(window.getComputedStyle(label)),
      dialogHeader: {
        padding: window.getComputedStyle(dialogHeader).padding,
        height: window.getComputedStyle(dialogHeader).height,
        borderBottom: window.getComputedStyle(dialogHeader).borderBottom,
      },
      dialogBody: {
        padding: window.getComputedStyle(dialogBody).padding,
      },
      dialogFooter: {
        padding: window.getComputedStyle(dialogFooter).padding,
        gap: window.getComputedStyle(dialogFooter).gap,
      }
    };
  });
  
  console.log('Ember exact computed styles:', JSON.stringify(styles, null, 2));
  await browser.close();
})();
