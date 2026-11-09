import { chromium } from './node_modules/playwright/index.mjs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(2000);
  
  // Navigate to budget page if not already there
  const budgetTab = await page.$('a[href*="/budget"], button:has-text("Budget"), .nav-link:has-text("Budget")');
  if (budgetTab) {
    await budgetTab.click();
    await page.waitForTimeout(1000);
  }
  
  await page.screenshot({ path: 'C:/Users/hoang/.gemini/antigravity/brain/2251b1bd-5559-4194-afea-176bd2fea0ff/react_budget_goal_status.png', fullPage: true });
  
  // Extract rendered statuses
  const rows = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('.budget-table-row.is-sub-category').forEach(r => {
      const name = r.querySelector('.budget-table-cell-name button')?.textContent?.trim() || '';
      const statusHtml = r.querySelector('.budget-table-cell-goal-status')?.innerHTML || '';
      const detailsHtml = r.querySelector('.budget-table-cell-goal-status-details')?.innerHTML || '';
      const segments = Array.from(r.querySelectorAll('.ynab-new-budget-bar-v2-segment')).map(s => ({
        class: s.className,
        style: s.getAttribute('style')
      }));
      list.push({ name, statusHtml, detailsHtml, segments });
    });
    return list;
  });
  console.log('Sample Rendered Rows:', JSON.stringify(rows.slice(0, 10), null, 2));
  
  await browser.close();
})();
