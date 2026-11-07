import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to pure React clone at http://localhost:5174/ ...");
  await page.goto("http://localhost:5174/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Capture Budget View
  await page.screenshot({ path: "output/pure_react_clone_budget.png" });
  console.log("Saved output/pure_react_clone_budget.png");

  // Click All Accounts in Sidebar
  console.log("Clicking All Accounts...");
  await page.click(".navlink-accounts a");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "output/pure_react_clone_accounts.png" });
  console.log("Saved output/pure_react_clone_accounts.png");

  // Click Add Account button in Sidebar
  console.log("Clicking Add Account...");
  await page.click(".nav-add-account");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "output/pure_react_clone_add_account_modal.png" });
  console.log("Saved output/pure_react_clone_add_account_modal.png");

  await browser.close();
  console.log("All screenshots captured successfully!");
}

main().catch(console.error);
