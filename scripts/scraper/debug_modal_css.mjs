import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(2000);
  
  // 1. Open Plan Settings
  const trigger = await page.$('.sidebar-nav-menu-budget');
  await trigger.click();
  await page.waitForTimeout(500);
  const settingsBtn = await page.$('.modal-select-budget-settings');
  await settingsBtn.click();
  await page.waitForTimeout(1000);
  
  const modalInfo = await page.evaluate(() => {
    const overlay = document.querySelector('.modal-overlay');
    const modal = document.querySelector('.modal');
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      id: s.id,
      className: s.className,
      style: {
        background: window.getComputedStyle(s).backgroundColor,
        color: window.getComputedStyle(s).color,
        border: window.getComputedStyle(s).border,
        padding: window.getComputedStyle(s).padding,
        height: window.getComputedStyle(s).height
      }
    }));
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
      id: i.id,
      className: i.className,
      style: {
        background: window.getComputedStyle(i).backgroundColor,
        color: window.getComputedStyle(i).color,
        border: window.getComputedStyle(i).border,
        padding: window.getComputedStyle(i).padding,
        height: window.getComputedStyle(i).height
      }
    }));
    return {
      overlayClass: overlay ? overlay.className : null,
      modalClass: modal ? modal.className : null,
      modalComputed: modal ? {
        width: window.getComputedStyle(modal).width,
        background: window.getComputedStyle(modal).backgroundColor,
        padding: window.getComputedStyle(modal).padding,
        borderRadius: window.getComputedStyle(modal).borderRadius,
        boxShadow: window.getComputedStyle(modal).boxShadow
      } : null,
      selects,
      inputs
    };
  });
  
  console.log('PLAN SETTINGS DEBUG:', JSON.stringify(modalInfo, null, 2));
  
  // Close and open Add Account
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  const addBtn = await page.$('.nav-add-account');
  await addBtn.click();
  await page.waitForTimeout(1000);
  
  const addInfo = await page.evaluate(() => {
    const modal = document.querySelector('.modal');
    return {
      modalClass: modal ? modal.className : null,
      modalWidth: modal ? window.getComputedStyle(modal).width : null,
      modalBg: modal ? window.getComputedStyle(modal).backgroundColor : null,
    };
  });
  console.log('ADD ACCOUNT DEBUG:', JSON.stringify(addInfo, null, 2));
  
  await browser.close();
})();
