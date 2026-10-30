import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;
const OUTPUT_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

function wrapInPreview(html, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} - YNAB Component</title>
  <style>
${MASTER_CSS}
  </style>
  <style>
    body {
      background-color: #f4f5f7;
      margin: 0;
      padding: 40px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .modal-overlay {
      position: relative !important;
      display: block !important;
      inset: auto !important;
      background: transparent !important;
    }
    .modal {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      margin: 20px auto !important;
      display: block !important;
    }
  </style>
</head>
<body class="ember-application">
  ${html}
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const { context, page } = await getBrowserContext({ headless: false });
  console.log("Navigating to Budget page...");
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // 1. ADD CATEGORY GROUP POPOVER
  console.log("1. Scraping Add Category Group Popover...");
  const addGroupBtn = page.locator("button:has-text('Category Group')").first();
  await addGroupBtn.click();
  await page.waitForTimeout(600);

  const modalAddGroup = page.locator(".modal-overlay.active, .modal-add-master-category").first();
  const htmlAddGroup = await modalAddGroup.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_add_category_group.html"), htmlAddGroup, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_add_category_group_preview.html"), wrapInPreview(htmlAddGroup, "Add Category Group Popover"), "utf8");
  await modalAddGroup.screenshot({ path: path.join(OUTPUT_DIR, "popover_add_category_group.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "popover_add_category_group_in_context.png") });
  console.log("✓ Saved popover_add_category_group");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 2. ADD CATEGORY POPOVER (under group Bills)
  console.log("2. Scraping Add Category Popover...");
  const billsGroup = page.locator(".budget-table-row.is-master-category").filter({ hasText: "Bills" }).first();
  await billsGroup.hover();
  await page.waitForTimeout(400);

  const addCatBtn = billsGroup.locator("button.budget-table-cell-add-category").first();
  await addCatBtn.click();
  await page.waitForTimeout(600);

  const modalAddCat = page.locator(".modal-overlay.active, .modal-add-sub-category").first();
  const htmlAddCat = await modalAddCat.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_add_category.html"), htmlAddCat, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_add_category_preview.html"), wrapInPreview(htmlAddCat, "Add Category Popover"), "utf8");
  await modalAddCat.screenshot({ path: path.join(OUTPUT_DIR, "popover_add_category.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "popover_add_category_in_context.png") });
  console.log("✓ Saved popover_add_category");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 3. EDIT CATEGORY GROUP POPOVER (click 'Bills')
  console.log("3. Scraping Edit Category Group Popover...");
  const editGroupBtn = billsGroup.locator("button.budget-table-cell-edit-category, button[title='Bills']").first();
  await editGroupBtn.click();
  await page.waitForTimeout(600);

  const modalEditGroup = page.locator(".modal-overlay.active, .modal-budget-edit-category").first();
  const htmlEditGroup = await modalEditGroup.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_edit_category_group.html"), htmlEditGroup, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_edit_category_group_preview.html"), wrapInPreview(htmlEditGroup, "Edit Category Group Popover"), "utf8");
  await modalEditGroup.screenshot({ path: path.join(OUTPUT_DIR, "popover_edit_category_group.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "popover_edit_category_group_in_context.png") });
  console.log("✓ Saved popover_edit_category_group");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 4. EDIT CATEGORY POPOVER (click 'Rent')
  console.log("4. Scraping Edit Category Popover...");
  const rentRow = page.locator(".budget-table-row.is-sub-category").filter({ hasText: "Rent" }).first();
  const editRentBtn = rentRow.locator(".budget-table-cell-name button").first();
  await editRentBtn.click();
  await page.waitForTimeout(600);

  const modalEditCat = page.locator(".modal-overlay.active, .modal-budget-edit-category").first();
  const htmlEditCat = await modalEditCat.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_edit_category.html"), htmlEditCat, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "popover_edit_category_preview.html"), wrapInPreview(htmlEditCat, "Edit Category Popover"), "utf8");
  await modalEditCat.screenshot({ path: path.join(OUTPUT_DIR, "popover_edit_category.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "popover_edit_category_in_context.png") });
  console.log("✓ Saved popover_edit_category");

  await context.close();
  console.log("\nAll Category and Category Group CRUD popovers scraped successfully!");
}

main().catch(console.error);
