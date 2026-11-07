import { chromium } from 'playwright';
import fs from 'fs';

async function findModal() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/accounts');
  await page.click('.nav-account-row:first-of-type');
  await page.waitForTimeout(500);

  const prevCount = await page.evaluate(() => document.querySelectorAll('*').length);
  await page.click('.accounts-header-edit-account');
  await page.waitForTimeout(1000);
  const postCount = await page.evaluate(() => document.querySelectorAll('*').length);

  console.log('DOM elements count before:', prevCount, 'after:', postCount);

  const lastDiv = await page.evaluate(() => {
    // Look at the last 3 children of body
    const bodyChildren = Array.from(document.body.children);
    return bodyChildren.slice(-4).map(el => ({
      tag: el.tagName,
      className: el.className,
      id: el.id,
      html: el.outerHTML.slice(0, 1000)
    }));
  });
  console.log('Last body children:', JSON.stringify(lastDiv, null, 2));

  await browser.close();
}
findModal();
