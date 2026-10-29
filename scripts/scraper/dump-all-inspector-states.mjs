import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".budget-table", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Click Groceries row
  const grocRow = page.locator(".budget-table-row").filter({ hasText: "Groceries" }).first();
  await grocRow.click();
  await page.waitForTimeout(800);

  // Expand Auto-assign card
  const autoAssignHeader = await page.$(".budget-breakdown-auto-assign .card-roll-up, .budget-breakdown-auto-assign button");
  if (autoAssignHeader) {
    await autoAssignHeader.click();
    await page.waitForTimeout(600);
  }

  // Also check calculator button click
  const assignedCell = grocRow.locator(".budget-table-cell-budgeted").first();
  await assignedCell.click();
  await page.waitForTimeout(400);

  const calcBtn = await page.$(".button-calculator");
  if (calcBtn) {
    console.log("Clicking button-calculator...");
    await calcBtn.click();
    await page.waitForTimeout(600);
  }

  // Get full inspector HTML when category is selected & auto-assign is expanded
  const fullInspectorHtml = await page.evaluate(() => {
    return document.querySelector(".budget-inspector").outerHTML;
  });

  // Get month summary inspector HTML when NO category is selected
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  const monthInspectorHtml = await page.evaluate(() => {
    return document.querySelector(".budget-inspector").outerHTML;
  });

  // Save both inspector states
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { OUTPUT_DIR } = await import("./browser-context.mjs");
  const destDir = path.join(OUTPUT_DIR, "test_plan_modals");

  fs.writeFileSync(path.join(destDir, "inspector_category_expanded.html"), fullInspectorHtml);
  fs.writeFileSync(path.join(destDir, "inspector_month_full.html"), monthInspectorHtml);
  console.log("Saved inspector_category_expanded.html and inspector_month_full.html");

  await context.close();
}

main().catch(console.error);
