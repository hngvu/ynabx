import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const CHECKING_ID = "ddd417e8-d4c9-4981-ad15-4c61c5d7ccc4";
const CHECKING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/${CHECKING_ID}`;
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
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-container {
      position: relative;
    }
  </style>
</head>
<body class="ember-application">
  <div class="preview-container">
    ${html}
  </div>
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log("Launching browser...");
  const { context, page } = await getBrowserContext({ headless: true });

  console.log("Navigating to Checking account...");
  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ynab-grid", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. ACTION BAR: Select one transaction checkbox
  console.log("\n--- Scraping Action Bar ---");
  const firstCheckbox = page.locator(".ynab-grid-body .ynab-grid-cell-checkbox button").first();
  await firstCheckbox.click();
  await page.waitForTimeout(1000);

  const actionBarLocator = page.locator(".register-action-bar-container");
  if (await actionBarLocator.count() > 0) {
    const actionBarHtml = await actionBarLocator.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_action_bar.html"), actionBarHtml, "utf8");
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_action_bar_preview.html"), wrapInPreview(actionBarHtml, "Transaction Action Bar"), "utf8");
    await actionBarLocator.screenshot({ path: path.join(OUTPUT_DIR, "transaction_action_bar.png") });
    console.log("✓ Saved transaction_action_bar");
  }

  // Click Edit menu inside Action Bar to get Action Bar Dropdown Menu
  const editBtn = page.locator(".register-action-bar-container button:has-text('Edit')").first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForTimeout(600);
    const editMenu = page.locator(".modal-overlay.active");
    if (await editMenu.count() > 0) {
      const editMenuHtml = await editMenu.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_edit_menu.html"), editMenuHtml, "utf8");
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_edit_menu_preview.html"), wrapInPreview(editMenuHtml, "Action Bar Edit Menu"), "utf8");
      await editMenu.screenshot({ path: path.join(OUTPUT_DIR, "action_bar_edit_menu.png") });
      console.log("✓ Saved action_bar_edit_menu");
    }
    // Dismiss menu by pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // Uncheck transaction
  await firstCheckbox.click();
  await page.waitForTimeout(500);

  // 2. Click "Add Transaction" button
  console.log("\n--- Opening Add Transaction Row ---");
  const addTxBtn = page.locator("button:has-text('Add Transaction')").first();
  await addTxBtn.click();
  await page.waitForTimeout(1000);

  // 3. DATE PICKER POPOVER
  console.log("Scraping Date Picker Popover...");
  const dateInput = page.locator(".ynab-grid-add-rows .ynab-grid-cell-date input, .is-editing .ynab-grid-cell-date input").first();
  await dateInput.click();
  await page.waitForTimeout(800);

  const datePicker = page.locator(".modal-overlay.active, .modal-account-calendar").first();
  if (await datePicker.count() > 0) {
    const datePickerHtml = await datePicker.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "popover_transaction_datepicker.html"), datePickerHtml, "utf8");
    fs.writeFileSync(path.join(OUTPUT_DIR, "popover_transaction_datepicker_preview.html"), wrapInPreview(datePickerHtml, "Transaction Date Picker Popover"), "utf8");
    await datePicker.screenshot({ path: path.join(OUTPUT_DIR, "popover_transaction_datepicker.png") });
    console.log("✓ Saved popover_transaction_datepicker");
  }

  // 4. PAYEE COMBOBOX
  console.log("Scraping Payee Combobox...");
  const payeeInput = page.locator(".ynab-grid-add-rows .ynab-grid-cell-payeeName input, .is-editing .ynab-grid-cell-payeeName input").first();
  await payeeInput.click();
  await page.waitForTimeout(800);

  const payeeCombobox = page.locator(".modal-overlay.active, .modal-account-payees").first();
  if (await payeeCombobox.count() > 0) {
    const payeeComboboxHtml = await payeeCombobox.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "combobox_payee_dropdown.html"), payeeComboboxHtml, "utf8");
    fs.writeFileSync(path.join(OUTPUT_DIR, "combobox_payee_dropdown_preview.html"), wrapInPreview(payeeComboboxHtml, "Payee Combobox Dropdown"), "utf8");
    await payeeCombobox.screenshot({ path: path.join(OUTPUT_DIR, "combobox_payee_dropdown.png") });
    console.log("✓ Saved combobox_payee_dropdown");
  }

  // 5. CATEGORY COMBOBOX
  console.log("Scraping Category Combobox...");
  const catInput = page.locator(".ynab-grid-add-rows .ynab-grid-cell-subCategoryName input, .is-editing .ynab-grid-cell-subCategoryName input").first();
  await catInput.click();
  await page.waitForTimeout(800);

  const catCombobox = page.locator(".modal-overlay.active, .modal-account-dropdown").first();
  if (await catCombobox.count() > 0) {
    const catComboboxHtml = await catCombobox.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "combobox_category_dropdown.html"), catComboboxHtml, "utf8");
    fs.writeFileSync(path.join(OUTPUT_DIR, "combobox_category_dropdown_preview.html"), wrapInPreview(catComboboxHtml, "Category Combobox Dropdown"), "utf8");
    await catCombobox.screenshot({ path: path.join(OUTPUT_DIR, "combobox_category_dropdown.png") });
    console.log("✓ Saved combobox_category_dropdown");
  }

  // Cancel Add Transaction
  const cancelBtn = page.locator(".ynab-grid-add-rows button:has-text('Cancel'), .is-editing button:has-text('Cancel')").first();
  if (await cancelBtn.count() > 0) {
    await cancelBtn.click();
  }

  console.log("\nAll requested components scraped successfully!");
  await context.close();
}

main().catch(console.error);
