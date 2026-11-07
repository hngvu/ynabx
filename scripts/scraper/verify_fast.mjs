import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to React Clone on 5174 (domcontentloaded)...");
  try {
    await page.goto("http://localhost:5174", { waitUntil: "domcontentloaded", timeout: 5000 });
  } catch (e) {
    console.log("5174 failed, trying 5175...");
    await page.goto("http://localhost:5175", { waitUntil: "domcontentloaded", timeout: 5000 });
  }
  
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "output/react_clone_exact_budget.png" });
  console.log("Saved output/react_clone_exact_budget.png");

  // Check title & layout
  const title = await page.title();
  console.log("Page title:", title);

  const budgetGrid = await page.locator(".budget-table").first();
  console.log("Budget table visible:", await budgetGrid.isVisible());

  await browser.close();
  console.log("Finished successfully!");
}

main().catch(console.error);
