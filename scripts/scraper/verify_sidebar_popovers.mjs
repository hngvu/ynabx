import { chromium } from 'playwright';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

async function comparePopoversAndModals() {
  const browser = await chromium.launch({ headless: true });

  // 1. Plan Menu Popover Comparison
  console.log('--- 1. Testing Plan Menu Popover Parity ---');
  
  // A. Ember
  const pageEmber = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await pageEmber.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/budget', { waitUntil: 'networkidle' });
  await pageEmber.click('button.sidebar-nav-menu-budget');
  await pageEmber.waitForTimeout(500);
  const emberMenu = await pageEmber.$('.ynab-new-settings-menu');
  let emberMenuBbox = null;
  if (emberMenu) {
    emberMenuBbox = await emberMenu.boundingBox();
  }
  await pageEmber.screenshot({ path: 'output/cmp_menu_ember.png' });

  // B. React
  const pageReact = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await pageReact.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await pageReact.click('button.sidebar-nav-menu-budget');
  await pageReact.waitForTimeout(500);
  await pageReact.screenshot({ path: 'output/cmp_menu_react.png' });

  // Pixelmatch Menu
  const imgEmberMenu = PNG.sync.read(fs.readFileSync('output/cmp_menu_ember.png'));
  const imgReactMenu = PNG.sync.read(fs.readFileSync('output/cmp_menu_react.png'));
  const diffMenu = new PNG({ width: 1400, height: 900 });
  const mismatchedMenu = pixelmatch(imgEmberMenu.data, imgReactMenu.data, diffMenu.data, 1400, 900, { threshold: 0.1 });
  fs.writeFileSync('output/cmp_menu_diff.png', PNG.sync.write(diffMenu));
  const menuDiffPercent = (mismatchedMenu / (1400 * 900)) * 100;
  console.log(`Plan Menu Popover diff: ${menuDiffPercent.toFixed(2)}% (Parity: ${(100 - menuDiffPercent).toFixed(2)}%)`);

  // 2. Edit Account Modal Comparison
  console.log('--- 2. Testing Edit Account Modal Parity ---');
  // Open Edit Account on Ember
  await pageEmber.goto('http://localhost:4200/9a070eef-a9b4-4903-b863-d703e7768ed4/accounts', { waitUntil: 'networkidle' });
  await pageEmber.click('.nav-account-row:first-of-type');
  await pageEmber.waitForTimeout(500);
  await pageEmber.click('.accounts-header-edit-account');
  await pageEmber.waitForTimeout(500);
  await pageEmber.screenshot({ path: 'output/cmp_account_modal_ember.png' });

  // Open Edit Account on React
  await pageReact.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await pageReact.click('.nav-account-row:first-of-type');
  await pageReact.waitForTimeout(500);
  await pageReact.click('.accounts-header-edit-account');
  await pageReact.waitForTimeout(500);
  await pageReact.screenshot({ path: 'output/cmp_account_modal_react.png' });

  // Pixelmatch Account Modal
  const imgEmberAcc = PNG.sync.read(fs.readFileSync('output/cmp_account_modal_ember.png'));
  const imgReactAcc = PNG.sync.read(fs.readFileSync('output/cmp_account_modal_react.png'));
  const diffAcc = new PNG({ width: 1400, height: 900 });
  const mismatchedAcc = pixelmatch(imgEmberAcc.data, imgReactAcc.data, diffAcc.data, 1400, 900, { threshold: 0.1 });
  fs.writeFileSync('output/cmp_account_modal_diff.png', PNG.sync.write(diffAcc));
  const accDiffPercent = (mismatchedAcc / (1400 * 900)) * 100;
  console.log(`Edit Account Modal diff: ${accDiffPercent.toFixed(2)}% (Parity: ${(100 - accDiffPercent).toFixed(2)}%)`);

  await browser.close();
}

comparePopoversAndModals();
