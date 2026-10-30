import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("./node_modules/playwright");
import path from "path";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", msg => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));

  const filePath = "file:///" + path.resolve("scripts/scraper/output/ynab_assembled_app.html").replace(/\\/g, "/");
  await page.goto(filePath, { waitUntil: "load" });

  // Switch to accounts tab
  console.log("Clicking accounts tab...");
  await page.click("#btn-tab-accounts");
  await page.waitForTimeout(500);

  // Check how many checkboxes exist in #view-accounts
  const cbInfo = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll("#view-accounts .ynab-grid-cell-checkbox button, #view-accounts .ynab-grid-cell-checkbox"));
    return {
      count: list.length,
      firstTag: list[0]?.tagName,
      firstClass: list[0]?.className
    };
  });
  console.log("Checkboxes info:", cbInfo);

  // Click the first checkbox
  const firstCb = page.locator("#view-accounts .ynab-grid-cell-checkbox button, #view-accounts .ynab-grid-cell-checkbox").first();
  await firstCb.click();
  await page.waitForTimeout(500);

  const abDisplay = await page.evaluate(() => {
    const el = document.getElementById("live-action-bar");
    return el ? { display: el.style.display, offsetWidth: el.offsetWidth, offsetHeight: el.offsetHeight } : "not found";
  });
  console.log("ActionBar state:", abDisplay);

  await browser.close();
})();
