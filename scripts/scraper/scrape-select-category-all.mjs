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
  </style>
</head>
<body class="ember-application">
  <div style="position: relative; max-width: 400px; width: 100%;">
    ${html}
  </div>
</body>
</html>`;
}

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // 1. Move Money "To Category" dropdown list
  console.log("1. Testing Move Money category select...");
  const rentRow = page.locator(".budget-table-row.is-sub-category").filter({ hasText: "Rent" }).first();
  const rentAvail = rentRow.locator(".ynab-new-budget-available-number").first();
  await rentAvail.click();
  await page.waitForTimeout(800);

  const toInput = page.locator(".modal-budget-move-money .categories-dropdown-container input, .modal-budget-move-money input[role='combobox']").first();
  console.log("Move Money To Input count:", await toInput.count());
  if (await toInput.count() > 0) {
    await toInput.click();
    await page.waitForTimeout(600);

    const openDropdown = await page.evaluate(() => {
      const active = Array.from(document.querySelectorAll(".dropdown-menu, .modal-list, .autocomplete, .categories-dropdown, ul[role='listbox'], .modal-popup"))
        .filter(el => {
          const s = window.getComputedStyle(el);
          return (s.position === "absolute" || s.position === "fixed") && el.offsetWidth > 40;
        });
      return active.map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.innerText.slice(0, 150),
        html: el.outerHTML
      }));
    });
    console.log("Move money open dropdown:", openDropdown);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "test_move_money_select_category.png") });

    if (openDropdown.length > 0) {
      fs.writeFileSync(path.join(OUTPUT_DIR, "dropdown_move_money_select_category.html"), openDropdown[0].html, "utf8");
      fs.writeFileSync(path.join(OUTPUT_DIR, "dropdown_move_money_select_category_preview.html"), wrapInPreview(openDropdown[0].html, "Move Money - Select Category Dropdown"), "utf8");
      console.log("✓ Saved dropdown_move_money_select_category");
    }
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 2. Select Multiple Categories -> Inspector state
  console.log("\n2. Testing Multiple Categories Selection...");
  const checkboxes = page.locator(".budget-table-row.is-sub-category .ynab-checkbox-button");
  await checkboxes.nth(1).click();
  await checkboxes.nth(2).click();
  await checkboxes.nth(3).click();
  await page.waitForTimeout(800);

  const inspectorEl = page.locator(".budget-inspector").first();
  const inspectorHtml = await inspectorEl.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_multiple_categories_selected.html"), inspectorHtml, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_multiple_categories_selected_preview.html"), wrapInPreview(inspectorHtml, "Inspector - Multiple Categories Selected"), "utf8");
  await inspectorEl.screenshot({ path: path.join(OUTPUT_DIR, "inspector_multiple_categories_selected.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "budget_multiple_categories_selected_page.png") });
  console.log("✓ Saved inspector_multiple_categories_selected");

  // 3. Test Header "CATEGORY" dropdown / select options
  console.log("\n3. Testing Category header checkbox / dropdown...");
  const headerCheckbox = page.locator(".budget-table-header-cell-checkbox button, .budget-table-header .ynab-checkbox-button").first();
  await headerCheckbox.click();
  await page.waitForTimeout(800);

  const allSelectedInspector = await page.locator(".budget-inspector").evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_all_categories_selected.html"), allSelectedInspector, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_all_categories_selected_preview.html"), wrapInPreview(allSelectedInspector, "Inspector - All Categories Selected"), "utf8");
  await page.locator(".budget-inspector").screenshot({ path: path.join(OUTPUT_DIR, "inspector_all_categories_selected.png") });
  console.log("✓ Saved inspector_all_categories_selected");

  await context.close();
  console.log("\nAll done!");
}

main().catch(console.error);
