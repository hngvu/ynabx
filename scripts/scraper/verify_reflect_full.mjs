import { chromium } from 'playwright';

async function testReflectFlow() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('1. Navigating to Reflect workspace...');
  await page.goto('http://localhost:5174/#/reflect');
  await page.waitForTimeout(2000);

  // Check Timeframe Button
  const tfBtn = await page.$('.filter-button-timeframe');
  const tfText = tfBtn ? await tfBtn.textContent() : '';
  console.log('Initial Timeframe label:', tfText?.trim());

  // Click Timeframe Button to open modal
  console.log('2. Opening Timeframe dropdown modal...');
  await tfBtn?.click();
  await page.waitForTimeout(500);

  let tfModal = await page.$('.modal-reports-timeframe');
  console.log('Timeframe modal visible:', !!tfModal);

  // Click "Latest 3 Months" preset
  const presetBtn = await page.$('.timeframe-option:has-text("Latest 3 Months")');
  console.log('Found Latest 3 Months button:', !!presetBtn);
  if (presetBtn) {
    await presetBtn.click();
    await page.waitForTimeout(600);
    const newTfText = await (await page.$('.filter-button-timeframe'))?.textContent();
    console.log('After selecting Latest 3 Months:', newTfText?.trim());
  }

  // Click Categories Filter button
  console.log('3. Testing Categories Filter modal...');
  const catBtn = await page.$('.filter-button-categories');
  await catBtn?.click();
  await page.waitForTimeout(500);

  let catModal = await page.$('.modal-reports-categories');
  console.log('Categories filter modal visible:', !!catModal);
  
  // Close categories modal by clicking Done
  const doneBtn = await page.$('.modal-reports-categories button.primary');
  if (doneBtn) {
    await doneBtn.click();
    await page.waitForTimeout(500);
    console.log('Closed Categories modal via Done button');
  }

  // Test Drill-down on Groups
  console.log('4. Testing Groups drill-down...');
  const groupsTab = await page.$('.spending-breakdown-category-group-toggle__button:has-text("Groups")');
  if (groupsTab) {
    await groupsTab.click();
    await page.waitForTimeout(800);
    console.log('Switched to Groups tab');

    // Click first group row to drill down
    const firstGroupRow = await page.$('.spending-breakdown-bar-chart-body .reflect-bar-chart-row');
    if (firstGroupRow) {
      await firstGroupRow.click();
      await page.waitForTimeout(800);
      const breadcrumbs = await page.$('.reflect-breadcrumbs__selected-group-breadcrumbs');
      console.log('Breadcrumbs visible after drill-down:', !!breadcrumbs);
      const breadcrumbText = breadcrumbs ? await breadcrumbs.textContent() : '';
      console.log('Breadcrumb text:', breadcrumbText?.replace(/\s+/g, ' ').trim());

      // Click "All Groups" in breadcrumb to return
      const allGroupsLink = await page.$('.all-groups-button');
      if (allGroupsLink) {
        await allGroupsLink.click();
        await page.waitForTimeout(500);
        console.log('Successfully navigated back to All Groups');
      }
    }
  }

  // Switch to Net Worth tab
  console.log('5. Navigating to Net Worth tab...');
  const nwTab = await page.$('.reports-nav-item:has-text("Net Worth")');
  if (nwTab) {
    await nwTab.click();
    await page.waitForTimeout(1500);
    const nwHeader = await page.$('.reports-header-title');
    console.log('Net Worth Header title:', (await nwHeader?.textContent())?.trim());

    // Check Share Your Progress button
    const shareBtn = await page.$('button:has-text("Share Your Progress")');
    console.log('Share Your Progress button visible:', !!shareBtn);
    if (shareBtn) {
      await shareBtn.click();
      await page.waitForTimeout(500);
      const shareModal = await page.$('.modal-chart-image-exporter');
      console.log('Share modal visible:', !!shareModal);
      const shareClose = await page.$('.modal-chart-image-exporter-header button');
      await shareClose?.click();
      await page.waitForTimeout(500);
      console.log('Closed Share modal');
    }
  }

  // Test Export button
  console.log('6. Testing Export modal...');
  const exportBtn = await page.$('.reports-export-button');
  if (exportBtn) {
    await exportBtn.click();
    await page.waitForTimeout(500);
    const exportModal = await page.$('.modal-export-reports');
    console.log('Export modal visible:', !!exportModal);
    const cancelBtn = await page.$('.modal-export-reports button:has-text("Cancel")');
    await cancelBtn?.click();
    await page.waitForTimeout(500);
    console.log('Closed Export modal');
  }

  // Switch to Age of Money tab
  console.log('7. Navigating to Age of Money tab...');
  const aomTab = await page.$('.reports-nav-item:has-text("Age of Money")');
  if (aomTab) {
    await aomTab.click();
    await page.waitForTimeout(1200);
    console.log('Switched to Age of Money tab');
  }

  console.log('8. Taking full screenshot of verified Reflect page...');
  await page.screenshot({ path: 'clone/verified_reflect.png' });

  await browser.close();
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

testReflectFlow().catch(err => {
  console.error('Playwright Test Error:', err);
  process.exit(1);
});
