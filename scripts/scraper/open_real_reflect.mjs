import { chromium } from 'playwright';

async function navigateToReflect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 1. First visit root to load session and local storage
  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 2. Click on Budget link to enter the budget
  console.log('Clicking into budget...');
  const budgetLink = page.locator('button:has-text("My Personal Budget"), a:has-text("My Personal Budget")').first();
  if (await budgetLink.isVisible()) {
    await budgetLink.click();
    await page.waitForTimeout(3000);
  }
  console.log('URL after budget click:', page.url());

  // 3. Now check sidebar links
  const sidebarLinks = await page.locator('.sidebar-nav a, .nav-main a, a').allInnerTexts();
  console.log('Sidebar links now:', sidebarLinks.filter(t => t.trim().length > 0));

  // 4. Try navigate to reflect route
  const reflectLink = page.locator('a[href*="reflect"], button:has-text("Reflect")').first();
  if (await reflectLink.isVisible()) {
    console.log('Found Reflect link in sidebar! Clicking...');
    await reflectLink.click();
    await page.waitForTimeout(3000);
  } else {
    // Navigate via budgetVersionId
    const currentUrl = page.url();
    const match = currentUrl.match(/http:\/\/localhost:4200\/([^/]+)/);
    if (match && match[1] && match[1] !== 'users') {
      const targetUrl = `http://localhost:4200/${match[1]}/reflect/spending-breakdown`;
      console.log('Navigating directly to:', targetUrl);
      await page.goto(targetUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
    }
  }

  console.log('Final URL in Ember:', page.url());
  await page.screenshot({ path: '../../clone/artifacts/ember_spending_real.png' });
  console.log('Saved real Ember Reflect screenshot to clone/artifacts/ember_spending_real.png');

  // Dump reflect DOM structure if present
  const reflectDom = await page.locator('.reflect-container, .reflect-content, .spending-breakdown, .reports-header').first().innerHTML().catch(() => 'NOT_FOUND');
  console.log('Reflect DOM length:', reflectDom.length);
  if (reflectDom.length > 50) {
    console.log('Reflect DOM preview:', reflectDom.slice(0, 400));
  }

  await browser.close();
}

navigateToReflect().catch(console.error);
