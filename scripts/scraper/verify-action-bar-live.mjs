import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("./node_modules/playwright");
import path from "path";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const filePath = "file:///" + path.resolve("scripts/scraper/output/ynab_assembled_app.html").replace(/\\/g, "/");
  await page.goto(filePath, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Switch to accounts tab
  console.log("Switching to accounts view...");
  await page.click("#btn-tab-accounts");
  await page.waitForTimeout(600);

  // Click the transaction row checkbox
  console.log("Clicking row checkbox...");
  const cb = page.locator("#view-accounts .ynab-grid-body .ynab-checkbox-button").first();
  await cb.click();
  await page.waitForTimeout(500);

  // Take screenshot with Action Bar visible
  await page.screenshot({ path: "scripts/scraper/output/assembled_with_action_bar.png" });
  console.log("Saved assembled_with_action_bar.png!");

  // Click More button in live action bar
  console.log("Clicking More button in live action bar...");
  const moreBtn = page.locator("#live-action-bar button").filter({ hasText: "More" }).first();
  await moreBtn.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: "scripts/scraper/output/assembled_with_more_menu.png" });
  console.log("Saved assembled_with_more_menu.png!");

  await browser.close();
})();
