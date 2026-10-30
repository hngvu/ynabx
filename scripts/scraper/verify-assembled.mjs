import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("./node_modules/playwright");
import path from "path";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const filePath = "file:///" + path.resolve("scripts/scraper/output/ynab_assembled_app.html").replace(/\\/g, "/");
  await page.goto(filePath, { waitUntil: "load" });

  // Switch to accounts tab
  await page.click("#btn-tab-accounts");
  await page.waitForTimeout(500);

  // Check first transaction checkbox
  await page.click("#view-accounts .ynab-grid-body .ynab-grid-cell-checkbox button");
  await page.waitForTimeout(500);

  // Check if live action bar is visible
  const isActionBarVisible = await page.isVisible("#live-action-bar");
  console.log("Is action bar visible:", isActionBarVisible);

  // Click More button in live action bar
  const moreBtn = page.locator("#live-action-bar button").filter({ hasText: "More" }).first();
  await moreBtn.click();
  await page.waitForTimeout(500);

  const isMoreModalVisible = await page.isVisible("#modal-actionBarMore");
  console.log("Is more menu modal visible:", isMoreModalVisible);

  await page.screenshot({ path: "scripts/scraper/output/assembled_more_menu_test.png" });
  console.log("Test screenshot saved!");
  await browser.close();
})();
