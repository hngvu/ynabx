import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;
const ACCOUNTS_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts`;

const targetDir = path.join(OUTPUT_DIR, "test_plan_modals");

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createStyledPreview(componentHtml, title) {
  return `<!DOCTYPE html>
<html lang="en" class="theme-default ynab-app">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="https://app.ynab.com/">
  <title>${title} - YNAB Spec Preview</title>
  <link rel="stylesheet" href="../css/all-ynab.css">
  <style>
    body {
      background: #f4f5f7;
      margin: 30px;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-card {
      background: #ffffff;
      border: 1px solid #d9dcde;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      display: inline-block;
      max-width: 100%;
    }
    .preview-title {
      font-size: 13px;
      font-weight: 700;
      color: #585d68;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      border-bottom: 1px solid #eef0f2;
      padding-bottom: 8px;
    }
  </style>
</head>
<body class="ynab-u">
  <div class="preview-card">
    <div class="preview-title">${title}</div>
    ${componentHtml}
  </div>
</body>
</html>`;
}

async function captureModalOrPopup(page, name, filename) {
  await page.waitForTimeout(600);
  const modalEl = await page.$(".modal-overlay.active, .modal-popup, .modal-container, .modal, .ember-modal-dialog");
  if (!modalEl) {
    console.warn(`  [Skip] Active modal/popover not found for: ${name}`);
    return null;
  }

  const html = await modalEl.evaluate(node => node.outerHTML);
  const styles = await modalEl.evaluate(node => {
    const computed = window.getComputedStyle(node);
    const result = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      result[prop] = computed.getPropertyValue(prop);
    }
    return result;
  });

  fs.writeFileSync(path.join(targetDir, `${filename}.html`), html, "utf8");
  fs.writeFileSync(path.join(targetDir, `${filename}-styles.json`), JSON.stringify(styles, null, 2), "utf8");
  fs.writeFileSync(path.join(targetDir, `${filename}_preview.html`), createStyledPreview(html, name), "utf8");

  try {
    await modalEl.screenshot({ path: path.join(targetDir, `${filename}.png`), timeout: 5000 });
  } catch (err) {}

  console.log(`  ✔ Captured: ${name} -> ${filename}.html`);
  return { html, styles };
}

async function captureElement(page, selector, name, filename) {
  const el = await page.$(selector);
  if (!el) {
    console.warn(`  [Skip] Selector not found: ${selector} (${name})`);
    return null;
  }

  const html = await el.evaluate(node => node.outerHTML);
  fs.writeFileSync(path.join(targetDir, `${filename}.html`), html, "utf8");
  fs.writeFileSync(path.join(targetDir, `${filename}_preview.html`), createStyledPreview(html, name), "utf8");

  try {
    await el.screenshot({ path: path.join(targetDir, `${filename}.png`), timeout: 5000 });
  } catch (err) {}

  console.log(`  ✔ Captured: ${name} -> ${filename}.html`);
  return { html };
}

async function dismiss(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

async function main() {
  await ensureDir(targetDir);
  console.log(`=== Scraping Test Plan: Categories, Progress Bars, Popovers & Modals ===\n`);

  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BUDGET VIEW: Categories & Progress Bars
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`1. Navigating to Budget: ${BUDGET_URL} ...`);
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".budget-table", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Capture Entire Budget Table with all sample categories & progress circles
  console.log("Capturing Budget Table & Rows with Target Status...");
  await captureElement(page, ".budget-table", "Budget Table with Progress & Sample Data", "budget_table_full");

  // Capture Category Rows with different progress states
  console.log("Capturing distinct progress row states...");
  // Funded state (e.g. Groceries)
  const grocRow = page.locator(".budget-table-row").filter({ hasText: "Groceries" }).first();
  if (await grocRow.count()) {
    await captureElement(page, ".budget-table-row:has-text('Groceries')", "Category Row - Funded with Progress", "row_funded_groceries");
  }

  // Underfunded / Needs more (e.g. Car Insurance or Car Payment)
  const insRow = page.locator(".budget-table-row").filter({ hasText: "Car Insurance" }).first();
  if (await insRow.count()) {
    await captureElement(page, ".budget-table-row:has-text('Car Insurance')", "Category Row - Underfunded Target", "row_underfunded_car_insurance");
  }

  // Overspent state (e.g. Rent or Electric)
  const rentRow = page.locator(".budget-table-row").filter({ hasText: "Rent" }).first();
  if (await rentRow.count()) {
    await captureElement(page, ".budget-table-row:has-text('Rent')", "Category Row - Overspent", "row_overspent_rent");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. INSPECTOR PANELS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n2. Capturing Inspector Panels...");
  // Select Groceries to see Funded Target Inspector
  if (await grocRow.count()) {
    await grocRow.click();
    await page.waitForTimeout(800);
    await captureElement(page, ".budget-inspector", "Inspector - Funded Category Target", "inspector_funded_target");
  }

  // Select Car Insurance to see Underfunded Target Inspector
  if (await insRow.count()) {
    await insRow.click();
    await page.waitForTimeout(800);
    await captureElement(page, ".budget-inspector", "Inspector - Underfunded Category Target", "inspector_underfunded_target");
  }

  // Select Rent to see Overspent Inspector
  if (await rentRow.count()) {
    await rentRow.click();
    await page.waitForTimeout(800);
    await captureElement(page, ".budget-inspector", "Inspector - Overspent Category", "inspector_overspent");
  }

  // Deselect row to see General Month Budget Summary Inspector
  console.log("Capturing Month Summary Inspector (deselecting category)...");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await captureElement(page, ".budget-inspector", "Inspector - Month Budget Summary", "inspector_month_summary");

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. POPOVERS & MODALS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n3. Capturing Popovers & Modals (Budget View)...");

  // A) Month Picker Popover
  console.log("Opening Month Picker...");
  const monthBtn = await page.$(".budget-header-calendar-date-button, .button-calendar-date, .budget-header-date button, button.budget-header-calendar-date");
  if (monthBtn) {
    await monthBtn.click();
    await captureModalOrPopup(page, "Month Picker Popover", "popover_month_picker");
    await dismiss(page);
  }

  // B) Ready To Assign Breakdown Popover
  console.log("Opening Ready To Assign breakdown...");
  const rtaPill = await page.$(".to-be-budgeted, .budget-header-totals-amount, .budget-header-totals-cell");
  if (rtaPill) {
    await rtaPill.click();
    await captureModalOrPopup(page, "Ready To Assign Breakdown Popover", "popover_rta_breakdown");
    await dismiss(page);
  }

  // C) Move Money Popover
  console.log("Opening Move Money Popover (Groceries Available)...");
  if (await grocRow.count()) {
    const grocAvail = grocRow.locator(".budget-table-cell-available button, .budget-table-cell-available span.currency, .budget-table-cell-available").first();
    await grocAvail.click({ force: true });
    await captureModalOrPopup(page, "Move Money Popover", "popover_move_money");
    await dismiss(page);
  }

  // D) Category Edit Modal / Menu
  console.log("Opening Category Edit Menu (Inspector edit button)...");
  if (await grocRow.count()) {
    await grocRow.click();
    await page.waitForTimeout(600);
    const catEditBtn = await page.$(".inspector-category-edit, button[aria-label*='Edit category']");
    if (catEditBtn) {
      await catEditBtn.click();
      await captureModalOrPopup(page, "Category Edit Menu Popover", "popover_category_edit_menu");
      await dismiss(page);
    }
  }

  // E) Category Group Menu Popover
  console.log("Opening Category Group Menu...");
  const groupMenuBtn = await page.$(".budget-table-row.is-master-category button.button-category-group-menu, .budget-table-row.is-master-category button[aria-label*='group']");
  if (groupMenuBtn) {
    await groupMenuBtn.click();
    await captureModalOrPopup(page, "Category Group Menu Popover", "popover_group_menu");
    await dismiss(page);
  }

  // F) Target Edit Wizard Modal / Popover
  console.log("Opening Target Edit Wizard...");
  if (await grocRow.count()) {
    await grocRow.click();
    await page.waitForTimeout(600);
    const editTargetBtn = await page.$(".budget-inspector button:has-text('Edit Target'), .budget-inspector button:has-text('Create Target')");
    if (editTargetBtn) {
      await editTargetBtn.click();
      await captureModalOrPopup(page, "Target Editor Wizard Modal", "modal_target_editor");
      await dismiss(page);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ACCOUNTS VIEW & MODALS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n4. Navigating to Accounts: ${ACCOUNTS_URL} ...`);
  await page.goto(ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nav-main, .sidebar", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click on a specific account (e.g. Visa Rewards or Checking)
  console.log("Clicking single account in sidebar...");
  const accountLink = await page.$(".nav-account-row a, .nav-accounts a.nav-account-item:not([href*='/accounts/all'])");
  if (accountLink) {
    const accName = (await accountLink.innerText()).trim();
    console.log(`  Selected account: ${accName}`);
    await accountLink.click();
    await page.waitForTimeout(2000);

    // Capture Account Register with sample transactions
    await captureElement(page, ".ynab-grid", "Account Transaction Ledger Grid", "account_transaction_grid");

    // Click 'Add Transaction' button
    console.log("Clicking 'Add Transaction'...");
    const addTxBtn = await page.$("button:has-text('Add Transaction'), button.button-add-transaction, .accounts-toolbar-add-transaction");
    if (addTxBtn && (await addTxBtn.isEnabled().catch(() => false))) {
      await addTxBtn.click();
      await page.waitForTimeout(800);
      await captureElement(page, ".ynab-grid-add-rows, .is-editing", "Add Transaction Row Form", "add_transaction_form_inline");
      await dismiss(page);
    }

    // Click 'Reconcile' button
    console.log("Clicking 'Reconcile' button...");
    const reconcileBtn = await page.$("button:has-text('Reconcile'), .button-reconcile");
    if (reconcileBtn && (await reconcileBtn.isEnabled().catch(() => false))) {
      await reconcileBtn.click();
      await captureModalOrPopup(page, "Reconcile Step 1 (Confirm Balance Prompt)", "modal_reconcile_step1_confirm");

      // Click 'No' to trigger discrepancy dialog
      console.log("Clicking 'No' on reconcile prompt...");
      const noBtn = await page.$(".modal-overlay.active button:has-text('No'), .ember-modal-dialog button:has-text('No')");
      if (noBtn) {
        await noBtn.click();
        await captureModalOrPopup(page, "Reconcile Step 2 (Discrepancy Input & Adjustment)", "modal_reconcile_step2_discrepancy");
      }
      await dismiss(page);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Update index.html
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n5. Updating Gallery Index...");
  const indexHtmlPath = path.join(OUTPUT_DIR, "index.html");
  let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");

  const testPlanSection = `
  <div class="section-title">🎯 Test Plan: Targets, Progress Bars & Modals</div>
  <div class="grid">
    <div class="card">
      <div class="card-title">Budget Table with Target Status</div>
      <div class="card-desc">All categories with funded/underfunded/overspent states and target circle SVGs.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/budget_table_full_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/budget_table_full.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Move Money Popover</div>
      <div class="card-desc">Interactive Move Money modal triggered by clicking an Available balance pill.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/popover_move_money_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/popover_move_money.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Month Calendar Popover</div>
      <div class="card-desc">Full 12-month calendar dropdown picker for year navigation.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/popover_month_picker_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/popover_month_picker.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Target Editor Wizard Modal</div>
      <div class="card-desc">Target setup modal: type (Set Aside/Refill/Have a balance), amount, and repeat schedule.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/modal_target_editor_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/modal_target_editor.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Category Edit Menu Popover</div>
      <div class="card-desc">Context menu for renaming category, editing notes, or modifying targets.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/popover_category_edit_menu_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/popover_category_edit_menu.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Reconcile Step 1 (Confirm Balance)</div>
      <div class="card-desc">Initial bank reconciliation prompt: 'Is your current account balance $X.XX?'.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/modal_reconcile_step1_confirm_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/modal_reconcile_step1_confirm.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Reconcile Step 2 (Discrepancy Flow)</div>
      <div class="card-desc">Adjustment flow when balance does not match: enters actual bank balance.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/modal_reconcile_step2_discrepancy_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/modal_reconcile_step2_discrepancy.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Target Inspector Detail Cards</div>
      <div class="card-desc">Funded, underfunded, and overspent inspector cards with breakdown data.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/inspector_funded_target_preview.html" target="_blank">Funded Target</a>
        <a class="btn btn-secondary" href="test_plan_modals/inspector_underfunded_target_preview.html" target="_blank">Underfunded Target</a>
      </div>
    </div>
  </div>
`;

  if (!indexHtml.includes("Test Plan: Targets, Progress Bars & Modals")) {
    indexHtml = indexHtml.replace("</body>", `${testPlanSection}\n</body>`);
    fs.writeFileSync(indexHtmlPath, indexHtml, "utf8");
    console.log("  ✔ Added Test Plan section to output/index.html");
  }

  if (!isCDP) {
    await context.close();
  }

  console.log(`\n✔ Completed! All modals and popovers saved in:\n  ${targetDir}\n`);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
