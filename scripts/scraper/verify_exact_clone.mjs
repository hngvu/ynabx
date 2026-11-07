import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to React Clone on 5175...");
  await page.goto("http://localhost:5175", { waitUntil: "networkidle", timeout: 8000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/scraper/output/react_clone_exact_100.png" });
  console.log("Captured: scripts/scraper/output/react_clone_exact_100.png");

  // Let's test tab switching to Accounts
  console.log("Clicking Accounts tab...");
  await page.click("#btn-tab-accounts");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scripts/scraper/output/react_clone_accounts_100.png" });

  // Let's test tab switching to Reflect
  console.log("Clicking Reflect tab...");
  await page.click("#btn-tab-reflect");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scripts/scraper/output/react_clone_reflect_100.png" });

  await browser.close();
  console.log("Verification finished successfully!");
}

main().catch(console.error);
