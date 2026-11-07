import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:4200/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Click on "My Personal Budget"
  const budgetBtn = page.locator('button.select-budget-name-button').first();
  console.log("Budget button visible:", await budgetBtn.isVisible());
  if (await budgetBtn.isVisible()) {
    await budgetBtn.click();
    await page.waitForTimeout(3000);
    console.log("Current URL after click:", page.url());
    await page.screenshot({ path: "output/live_ember_in_budget.png" });
    console.log("Saved output/live_ember_in_budget.png");
  }

  await browser.close();
}

main().catch(console.error);
