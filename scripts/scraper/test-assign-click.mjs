import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".budget-table", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Rent row
  const row = page.locator(".budget-table-row").filter({ hasText: "Rent" }).first();
  await row.click();
  await page.waitForTimeout(1000);

  // 1. Click 'Assign' button in inspector
  console.log("Looking for Assign button in inspector...");
  const assignBtn = page.locator(".budget-inspector button").filter({ hasText: /^Assign$/ }).first();
  if (await assignBtn.count()) {
    console.log("Found Assign button, clicking...");
    await assignBtn.click();
    await page.waitForTimeout(800);
    const pop = await page.evaluate(() => {
      const active = document.querySelector(".modal-overlay.active, .modal-popup, .modal-container, .modal, [class*='dropdown']");
      return active ? { className: active.className, html: active.outerHTML } : null;
    });
    if (pop) {
      console.log("✔ Captured Assign Popover! Class:", pop.className);
      fs.writeFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "popover_assign_button.html"), pop.html);
      await page.screenshot({ path: path.join(OUTPUT_DIR, "test_plan_modals", "popover_assign_button.png") });
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 2. Click category context menu on the row
  console.log("Looking for category context menu on row...");
  const catMenuBtn = row.locator("button.button-category-menu, button[aria-label*='category']").first();
  if (await catMenuBtn.count()) {
    await catMenuBtn.click();
    await page.waitForTimeout(800);
    const catMenu = await page.evaluate(() => {
      const active = document.querySelector(".modal-overlay.active, .modal-popup, .modal");
      return active ? active.outerHTML : null;
    });
    if (catMenu) {
      console.log("✔ Captured Category Menu Popover!");
      fs.writeFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "popover_category_row_menu.html"), catMenu);
      await page.screenshot({ path: path.join(OUTPUT_DIR, "test_plan_modals", "popover_category_row_menu.png") });
    }
    await page.keyboard.press("Escape");
  }

  // 3. Click 'Recent Moves' in Inspector (deselect category)
  console.log("Deselecting category to get Month Inspector & Recent Moves...");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const recentMovesBtn = await page.$(".recent-moves-open-modal-container button, button:has-text('Recent Moves')");
  if (recentMovesBtn) {
    await recentMovesBtn.click();
    await page.waitForTimeout(800);
    const recentMoves = await page.evaluate(() => {
      const active = document.querySelector(".modal-overlay.active, .modal-popup, .modal");
      return active ? active.outerHTML : null;
    });
    if (recentMoves) {
      console.log("✔ Captured Recent Moves Modal!");
      fs.writeFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "modal_recent_moves.html"), recentMoves);
      await page.screenshot({ path: path.join(OUTPUT_DIR, "test_plan_modals", "modal_recent_moves.png") });
    }
    await page.keyboard.press("Escape");
  }

  // 4. Capture Calculator inline box on Assigned cell
  console.log("Focusing Assigned input to capture calculator state...");
  const assignedCell = row.locator(".budget-table-cell-budgeted").first();
  await assignedCell.click();
  await page.waitForTimeout(500);
  const calcBox = await page.evaluate(() => {
    const el = document.querySelector(".ynab-new-currency-input.is-focused, .budget-table-cell-budgeted");
    return el ? el.outerHTML : null;
  });
  if (calcBox) {
    console.log("✔ Captured Assigned Calculator Box!");
    fs.writeFileSync(path.join(OUTPUT_DIR, "test_plan_modals", "box_assigned_calculator.html"), calcBox);
  }

  await context.close();
  console.log("\nDone capturing inspector & category popovers!");
}

main().catch(console.error);
