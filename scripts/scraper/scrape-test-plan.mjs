import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BASE_BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;
const BASE_ACCOUNTS_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts`;

const targetDir = path.join(OUTPUT_DIR, "test_plan");

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
  <title>${title} - YNAB Test Plan Spec</title>
  <link rel="stylesheet" href="../css/all-ynab.css">
  <style>
    body {
      background: #f4f5f7;
      margin: 24px;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-card {
      background: #ffffff;
      border: 1px solid #d9dcde;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      margin-bottom: 24px;
      display: inline-block;
      min-width: 320px;
      max-width: 100%;
    }
    .preview-header {
      color: #3b4049;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      border-bottom: 1px solid #edf0f2;
      padding-bottom: 8px;
    }
  </style>
</head>
<body class="ynab-u">
  <div class="preview-card">
    <div class="preview-header">${title}</div>
    ${componentHtml}
  </div>
</body>
</html>`;
}

async function captureComponent(page, selector, name, subFolder = "") {
  const destDir = subFolder ? path.join(targetDir, subFolder) : targetDir;
  await ensureDir(destDir);

  const el = await page.$(selector);
  if (!el) {
    console.warn(`  [Skip] Selector not found: ${selector} (${name})`);
    return null;
  }

  const html = await el.evaluate(node => node.outerHTML);
  const styles = await el.evaluate(node => {
    const computed = window.getComputedStyle(node);
    const result = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      result[prop] = computed.getPropertyValue(prop);
    }
    return result;
  });

  fs.writeFileSync(path.join(destDir, `${name}.html`), html, "utf8");
  fs.writeFileSync(path.join(destDir, `${name}-styles.json`), JSON.stringify(styles, null, 2), "utf8");
  fs.writeFileSync(path.join(destDir, `${name}_preview.html`), createStyledPreview(html, name), "utf8");

  try {
    await el.screenshot({ path: path.join(destDir, `${name}.png`), timeout: 5000 });
  } catch (err) {}

  console.log(`  ✔ Captured: ${name} (${subFolder || "."})`);
  return { html, styles };
}

async function dismissAllPopups(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

async function main() {
  await ensureDir(targetDir);
  console.log(`=== Scraping YNAB Plan "test" (${TEST_PLAN_ID}) ===\n`);

  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BUDGET VIEW: Progress bars, category targets, inspector details
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`1. Navigating to Budget: ${BASE_BUDGET_URL} ...`);
  await page.goto(BASE_BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".budget-table, .budget-header", { timeout: 30000 });
  await page.waitForTimeout(2500);

  // Full page snapshot
  const budgetFullHtml = await page.content();
  fs.writeFileSync(path.join(targetDir, "budget_full_page.html"), budgetFullHtml, "utf8");
  await page.screenshot({ path: path.join(targetDir, "budget_full_page.png"), fullPage: true });
  console.log("  ✔ Saved budget_full_page.html and screenshot");

  // Capture Budget Table (contains all category rows & progress bars)
  await captureComponent(page, ".budget-table", "budget_table_with_progress", "budget");
  await captureComponent(page, ".budget-table-container", "budget_table_container", "budget");

  // Capture all rows with progress indicators
  console.log("Searching for categories with targets/progress bars...");
  const progressBars = await page.$$(".category-goal-progress, .goal-progress-bar, .budget-table-row:has(.progress-bar), .budget-table-row:has(svg.goal-progress)");
  console.log(`  Found ${progressBars.length} progress bar elements in budget table.`);
  if (progressBars.length > 0) {
    await captureComponent(page, ".budget-table-row:has(.category-goal-progress, .goal-progress-bar, svg.goal-progress)", "sample_row_with_progress", "budget");
  }

  // Click on a category with progress/target to load Inspector details
  console.log("Clicking category row to inspect Goal/Target Card...");
  const catRows = await page.$$(".budget-table-row:not(.is-master-category)");
  for (let i = 0; i < Math.min(catRows.length, 5); i++) {
    await catRows[i].click();
    await page.waitForTimeout(700);

    // Check if inspector has target card
    const targetCard = await page.$(".inspector-target, .goal-card, .target-card, .budget-inspector-target");
    if (targetCard) {
      await captureComponent(page, ".budget-inspector", `inspector_target_category_${i + 1}`, "inspector");
      await captureComponent(page, ".inspector-target, .goal-card, .target-card, .budget-inspector-target", `target_card_detail_${i + 1}`, "inspector");
      break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. POPOVERS & MODALS: Budget Grid
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n2. Scraping Popovers & Modals (Budget Grid)...");

  // A) Ready To Assign Breakdown Popover
  console.log("Opening Ready To Assign breakdown popover...");
  const rtaPill = await page.$(".to-be-budgeted, .budget-header-totals-amount, .budget-header-totals-cell");
  if (rtaPill) {
    await rtaPill.click();
    await page.waitForTimeout(800);
    await captureComponent(page, ".modal-container, .modal-popup, .ember-modal-dialog", "modal_rta_breakdown", "modals");
    await dismissAllPopups(page);
  }

  // B) Month Picker Dropdown / Calendar Popover
  console.log("Opening Month Picker popover...");
  const monthBtn = await page.$(".budget-header-calendar-date-button, .button-calendar-date, .budget-header-date button");
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(800);
    await captureComponent(page, ".modal-container, .modal-popup, .modal-budget-calendar, .ember-modal-dialog", "modal_month_picker", "modals");
    await dismissAllPopups(page);
  }

  // C) Move Money Popover (click on Available balance pill)
  console.log("Opening Move Money popover (Available balance click)...");
  const availPill = await page.$(".budget-table-cell-available button, .budget-table-cell-available .currency, .currency-pill");
  if (availPill) {
    await availPill.click();
    await page.waitForTimeout(800);
    await captureComponent(page, ".modal-container, .modal-popup, .modal-move-money, .ember-modal-dialog", "modal_move_money", "modals");
    await dismissAllPopups(page);
  }

  // D) Category Context Menu Popover
  console.log("Opening Category context menu...");
  const catMenuBtn = await page.$(".budget-table-row:not(.is-master-category) .button-category-menu, .budget-table-row:not(.is-master-category) button[aria-label*='category']");
  if (catMenuBtn) {
    await catMenuBtn.click();
    await page.waitForTimeout(800);
    await captureComponent(page, ".modal-container, .modal-popup, .ember-modal-dialog", "modal_category_menu", "modals");
    await dismissAllPopups(page);
  }

  // E) Master Category Group Menu Popover
  console.log("Opening Master Category Group menu...");
  const groupMenuBtn = await page.$(".budget-table-row.is-master-category .button-category-group-menu, .budget-table-row.is-master-category button[aria-label*='group']");
  if (groupMenuBtn) {
    await groupMenuBtn.click();
    await page.waitForTimeout(800);
    await captureComponent(page, ".modal-container, .modal-popup, .ember-modal-dialog", "modal_group_menu", "modals");
    await dismissAllPopups(page);
  }

  // F) Target Edit / Creation Popover / Wizard
  console.log("Checking for Edit Target button in Inspector...");
  const editTargetBtn = await page.$(".budget-inspector button:has-text('Edit Target'), .budget-inspector button:has-text('Create Target')");
  if (editTargetBtn) {
    await editTargetBtn.click();
    await page.waitForTimeout(800);
    await captureComponent(page, ".modal-container, .modal-popup, .ember-modal-dialog", "modal_target_editor", "modals");
    await dismissAllPopups(page);
  }

  // G) Add Category Group Button / Modal
  console.log("Checking Add Category Group button...");
  const addGroupBtn = await page.$(".button-add-category-group, button:has-text('Add Group')");
  if (addGroupBtn) {
    await addGroupBtn.click();
    await page.waitForTimeout(800);
    await captureComponent(page, ".modal-container, .modal-popup, .ember-modal-dialog, .budget-table-row.is-editing", "modal_add_group", "modals");
    await dismissAllPopups(page);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ACCOUNTS REGISTER & MODALS (Test Plan)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n3. Navigating to Accounts: ${BASE_ACCOUNTS_URL} ...`);
  await page.goto(BASE_ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nav-main, .sidebar", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Full page snapshot
  const accountsFullHtml = await page.content();
  fs.writeFileSync(path.join(targetDir, "accounts_full_page.html"), accountsFullHtml, "utf8");
  await page.screenshot({ path: path.join(targetDir, "accounts_full_page.png"), fullPage: true });

  // Look for a specific account in sidebar (Checking / Savings / Credit Card)
  console.log("Looking for an individual account to test Add Row & Reconcile...");
  const singleAccountLink = await page.$(".nav-account-row a, .nav-accounts a.nav-account-item:not([href*='/accounts/all'])");
  if (singleAccountLink) {
    const accountName = await singleAccountLink.innerText();
    console.log(`  Opening account: ${accountName.trim()}`);
    await singleAccountLink.click();
    await page.waitForTimeout(2000);

    // Save individual account register
    await captureComponent(page, ".accounts-header", "single_account_header", "accounts");
    await captureComponent(page, ".ynab-grid", "single_account_grid", "accounts");

    // Click 'Add Transaction'
    console.log("Clicking 'Add Transaction' button...");
    const addTxBtn = await page.$("button:has-text('Add Transaction'), button.button-add-transaction, .accounts-toolbar-add-transaction");
    if (addTxBtn && (await addTxBtn.isEnabled().catch(() => false))) {
      await addTxBtn.click();
      await page.waitForTimeout(800);
      await captureComponent(page, ".ynab-grid-add-rows, .is-editing", "add_transaction_form", "accounts");

      // Check if 'Split Transaction' button is inside the form
      const splitBtn = await page.$("button:has-text('Split'), .button-split");
      if (splitBtn) {
        console.log("Clicking 'Split Transaction' button...");
        await splitBtn.click();
        await page.waitForTimeout(800);
        await captureComponent(page, ".modal-container, .modal-split, .is-split", "split_transaction_editor", "modals");
      }
      await dismissAllPopups(page);
    }

    // Click 'Reconcile'
    console.log("Clicking 'Reconcile' button...");
    const reconcileBtn = await page.$("button:has-text('Reconcile'), .button-reconcile");
    if (reconcileBtn && (await reconcileBtn.isEnabled().catch(() => false))) {
      await reconcileBtn.click();
      await page.waitForTimeout(800);
      await captureComponent(page, ".modal-container, .modal-reconcile, .ember-modal-dialog", "modal_reconcile_initial", "modals");

      // Click 'No' to trigger the discrepancy adjustment flow!
      console.log("Clicking 'No' on reconcile prompt to capture discrepancy dialog...");
      const noBtn = await page.$(".modal-container button:has-text('No'), .ember-modal-dialog button:has-text('No')");
      if (noBtn) {
        await noBtn.click();
        await page.waitForTimeout(800);
        await captureComponent(page, ".modal-container, .modal-reconcile, .ember-modal-dialog", "modal_reconcile_discrepancy", "modals");
      }
      await dismissAllPopups(page);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Update index.html and CSS bundles
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n4. Finalizing test plan assets & preview gallery...");

  if (!isCDP) {
    await context.close();
  }

  console.log(`\n✔ Completed scraping Test Plan! All files saved in:\n  ${targetDir}\n`);
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
