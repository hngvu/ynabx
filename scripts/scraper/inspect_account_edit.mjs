import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget', { waitUntil: 'networkidle' });
  const html = await page.$eval('.nav-account-row', el => el.outerHTML);
  console.log('Account row HTML:');
  console.log(html);

  // Check event listeners or onclick on .nav-account-icons-left
  const listenerInfo = await page.evaluate(() => {
    const icon = document.querySelector('.nav-account-icons-left');
    return {
      tagName: icon.tagName,
      className: icon.className,
      hasEmberAction: icon.getAttribute('data-ember-action') || icon.getAttribute('id')
    };
  });
  console.log('Icon info:', listenerInfo);

  // Try clicking with dispatching mouse events
  console.log('Dispatching click event...');
  await page.evaluate(() => {
    const el = document.querySelector('.nav-account-icons-left');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });
  await page.waitForTimeout(1000);

  const modals = await page.$$eval('[class*="modal"]', els => els.map(e => e.className));
  console.log('Modals after dispatchEvent:', modals);

  // Let's also check Edit Account from account register page
  console.log('Navigating to Chase Checking account register...');
  await page.click('.nav-account-row');
  await page.waitForTimeout(1500);
  console.log('Current URL:', page.url());

  // Look for edit account button in account register header
  const accountHeaderButtons = await page.$$eval('.accounts-header button, .accounts-header [role="button"], .accounts-header-title button, .accounts-header-edit', els => els.map(e => ({
    class: e.className,
    text: e.innerText
  })));
  console.log('Account header buttons:', accountHeaderButtons);

  await browser.close();
}
run();
