import { chromium } from "playwright";

async function testLive() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173 ...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  // Check if login page or budget page
  const hasLogin = await page.$('input[type="email"]');
  if (hasLogin) {
    console.log("Logging in with demo account...");
    await page.fill('input[type="email"]', "vuhse182692@fpt.edu.vn");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: "../../scratch/live_budget_screen.png" });
  console.log("Saved scratch/live_budget_screen.png");

  // Let's test clicking the month picker button
  const monthBtn = await page.$(".budget-header-calendar-date-button");
  if (monthBtn) {
    console.log("Clicking month picker button...");
    await monthBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../../scratch/live_month_picker_opened.png" });
    console.log("Saved scratch/live_month_picker_opened.png");

    // Close month picker
    await monthBtn.click();
    await page.waitForTimeout(500);
  }

  // Let's test clicking an available pill button
  const availBtn = await page.$(".ynab-new-budget-available-number");
  if (availBtn) {
    console.log("Clicking available pill button...");
    await availBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../../scratch/live_move_money_opened.png" });
    console.log("Saved scratch/live_move_money_opened.png");
  }

  await browser.close();
  console.log("Finished live UI test.");
}

testLive().catch(console.error);
