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
  <div style="width: 360px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 16px;">
    ${html}
  </div>
</body>
</html>`;
}

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  console.log("Navigating to Plan / Budget page...");
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Uncheck any selected checkboxes first by clicking header if checked or clicking outside
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // 1. SELECT FUNDED CATEGORY: Groceries
  console.log("\n1. Selecting Funded Category: Groceries...");
  const groceriesRow = page.locator(".budget-table-row.is-sub-category").filter({ hasText: "Groceries" }).first();
  // Click checkbox or row
  const groceriesCb = groceriesRow.locator(".ynab-checkbox-button").first();
  await groceriesCb.click();
  await page.waitForTimeout(800);

  const groceriesInspector = page.locator(".budget-inspector").first();
  const groceriesHtml = await groceriesInspector.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_category_groceries_selected.html"), groceriesHtml, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_category_groceries_selected_preview.html"), wrapInPreview(groceriesHtml, "Inspector - Groceries (Funded) Selected"), "utf8");
  await groceriesInspector.screenshot({ path: path.join(OUTPUT_DIR, "inspector_category_groceries_selected.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "plan_page_groceries_selected.png") });
  console.log("✓ Saved Groceries (Funded) Inspector state & page screenshot");

  // Uncheck Groceries
  await groceriesCb.click();
  await page.waitForTimeout(400);

  // 2. SELECT OVERSPENT CATEGORY: Rent or Electric
  console.log("\n2. Selecting Overspent Category: Electric...");
  const electricRow = page.locator(".budget-table-row.is-sub-category").filter({ hasText: "Electric" }).first();
  const electricCb = electricRow.locator(".ynab-checkbox-button").first();
  await electricCb.click();
  await page.waitForTimeout(800);

  const electricInspector = page.locator(".budget-inspector").first();
  const electricHtml = await electricInspector.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_category_electric_selected.html"), electricHtml, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_category_electric_selected_preview.html"), wrapInPreview(electricHtml, "Inspector - Electric (Overspent) Selected"), "utf8");
  await electricInspector.screenshot({ path: path.join(OUTPUT_DIR, "inspector_category_electric_selected.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "plan_page_electric_selected.png") });
  console.log("✓ Saved Electric (Overspent) Inspector state & page screenshot");

  // Uncheck Electric
  await electricCb.click();
  await page.waitForTimeout(400);

  // 3. SELECT UNDERFUNDED CATEGORY: Car Insurance
  console.log("\n3. Selecting Underfunded Category: Car Insurance...");
  const insuranceRow = page.locator(".budget-table-row.is-sub-category").filter({ hasText: "Car Insurance" }).first();
  const insuranceCb = insuranceRow.locator(".ynab-checkbox-button").first();
  await insuranceCb.click();
  await page.waitForTimeout(800);

  const insuranceInspector = page.locator(".budget-inspector").first();
  const insuranceHtml = await insuranceInspector.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_category_car_insurance_selected.html"), insuranceHtml, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_category_car_insurance_selected_preview.html"), wrapInPreview(insuranceHtml, "Inspector - Car Insurance (Underfunded) Selected"), "utf8");
  await insuranceInspector.screenshot({ path: path.join(OUTPUT_DIR, "inspector_category_car_insurance_selected.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "plan_page_car_insurance_selected.png") });
  console.log("✓ Saved Car Insurance (Underfunded) Inspector state & page screenshot");

  // 4. SELECT ENTIRE CATEGORY GROUP: Bills
  console.log("\n4. Selecting Category Group: Bills...");
  await insuranceCb.click();
  await page.waitForTimeout(400);

  const billsGroupRow = page.locator(".budget-table-row.is-master-category").filter({ hasText: "Bills" }).first();
  const billsCb = billsGroupRow.locator(".ynab-checkbox-button").first();
  await billsCb.click();
  await page.waitForTimeout(800);

  const billsInspector = page.locator(".budget-inspector").first();
  const billsHtml = await billsInspector.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_group_bills_selected.html"), billsHtml, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "inspector_group_bills_selected_preview.html"), wrapInPreview(billsHtml, "Inspector - Category Group (Bills) Selected"), "utf8");
  await billsInspector.screenshot({ path: path.join(OUTPUT_DIR, "inspector_group_bills_selected.png") });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "plan_page_group_bills_selected.png") });
  console.log("✓ Saved Group Bills Selected Inspector state & page screenshot");

  await context.close();
  console.log("\nDone scraping selected category states in Plan page!");
}

main().catch(console.error);
