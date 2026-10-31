import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const SPENDING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/reflect/spending-breakdown`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(SPENDING_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const timeframeBtn = page.locator(".filter-button-timeframe").first();
    await timeframeBtn.click();
    await page.waitForTimeout(800);

    const modal = await page.evaluate(() => {
      const m = document.querySelector(".modal-overlay, .modal-popup, .modal, .popover, [role='dialog']");
      return m ? { class: m.className, html: m.outerHTML } : null;
    });
    console.log("Timeframe modal result:", modal?.class);
    if (modal) {
      fs.writeFileSync("scripts/scraper/output/reports/popover_filter_timeframe.html", modal.html);
      await page.screenshot({ path: "scripts/scraper/output/reports/report_filter_timeframe_open.png" });
    }
  } finally {
    await context.close();
  }
}

main().catch(console.error);
