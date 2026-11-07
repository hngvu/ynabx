import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:4200');
  await page.waitForTimeout(3000);
  
  // Click on the budget card or navigate to budget route
  await page.evaluate(() => {
    // Check if there is a plan card to click
    const planCard = document.querySelector('.card, .users-budgets, a[href*="budget"]');
    if (planCard) planCard.click();
    else {
      // try transition via router
      const appWrapper = window.emberInspectorApps?.[0];
      const realApp = appWrapper?.app;
      const instance = Array.from(realApp?._applicationInstances.values())[0];
      const router = instance.lookup('service:router');
      router.transitionTo('budget.index');
    }
  });
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'ember_budget_view.png' });
  console.log('Saved ember_budget_view.png');
  
  const budgetDom = await page.evaluate(() => {
    const header = document.querySelector('.budget-header');
    const table = document.querySelector('.budget-table, .budget-table-container');
    const inspector = document.querySelector('.budget-inspector');
    return {
      url: window.location.href,
      header: header?.className,
      table: table?.className,
      inspector: inspector?.className,
      contentHtml: document.querySelector('.content')?.innerHTML?.slice(0, 1000)
    };
  });
  
  console.log(JSON.stringify(budgetDom, null, 2));
  await browser.close();
})();
