import { chromium } from "playwright";

async function checkPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  const hasEmail = await page.$('input[type="email"]');
  if (hasEmail) {
    console.log("Switching to Sign Up...");
    await page.click('button:has-text("Sign Up")');
    await page.waitForTimeout(300);

    const testEmail = `test_${Date.now()}@example.com`;
    console.log("Registering with:", testEmail);
    if (await page.$('#auth-display-name')) {
      await page.fill('#auth-display-name', 'Test User');
    }
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  console.log("Current URL after register:", page.url());
  const bodyText = await page.innerText("body");
  console.log("Body snippet:", bodyText.substring(0, 300));

  await page.screenshot({ path: "../../scratch/current_budget_full.png" });
  console.log("Saved scratch/current_budget_full.png");

  // Now test month picker
  const monthBtn = await page.$(".budget-header-calendar-date-button");
  if (monthBtn) {
    console.log("Clicking month picker...");
    await monthBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../../scratch/test_month_picker_opened.png" });
    console.log("Saved scratch/test_month_picker_opened.png");
    
    // Try clicking monthBtn again to see if it closes or what happens
    await monthBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../../scratch/test_month_picker_after_second_click.png" });
  }

  // Now test category menu popover
  const catBtn = await page.$(".budget-table-cell-name button");
  if (catBtn) {
    console.log("Clicking category button:", await catBtn.innerText());
    await catBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "../../scratch/test_cat_menu_opened.png" });
    console.log("Saved scratch/test_cat_menu_opened.png");
  }

  await browser.close();
}

checkPage().catch(console.error);
