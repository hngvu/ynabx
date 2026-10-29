import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const CHECKING_ID = "ddd417e8-d4c9-4981-ad15-4c61c5d7ccc4";
const VISA_ID = "595deb05-9b69-4aff-8619-1a23c63acbb5";

const CHECKING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/${CHECKING_ID}`;
const VISA_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/${VISA_ID}`;

const targetDir = path.join(OUTPUT_DIR, "test_plan_modals");

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
      margin: 24px;
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
  await page.waitForTimeout(700);
  const modalEl = await page.$(".modal-overlay.active, .modal-popup, .modal-container, .modal, .ember-modal-dialog");
  if (!modalEl) {
    console.warn(`  [Skip] Modal not found: ${name}`);
    return null;
  }

  const html = await modalEl.evaluate(node => node.outerHTML);
  fs.writeFileSync(path.join(targetDir, `${filename}.html`), html, "utf8");
  fs.writeFileSync(path.join(targetDir, `${filename}_preview.html`), createStyledPreview(html, name), "utf8");

  try {
    await modalEl.screenshot({ path: path.join(targetDir, `${filename}.png`), timeout: 5000 });
  } catch (err) {}

  console.log(`  ✔ Captured Modal: ${name} -> ${filename}.html`);
  return { html };
}

async function captureElement(page, selector, name, filename) {
  const el = await page.$(selector);
  if (!el) {
    console.warn(`  [Skip] Element not found: ${selector}`);
    return null;
  }

  const html = await el.evaluate(node => node.outerHTML);
  fs.writeFileSync(path.join(targetDir, `${filename}.html`), html, "utf8");
  fs.writeFileSync(path.join(targetDir, `${filename}_preview.html`), createStyledPreview(html, name), "utf8");

  try {
    await el.screenshot({ path: path.join(targetDir, `${filename}.png`), timeout: 5000 });
  } catch (err) {}

  console.log(`  ✔ Captured Element: ${name} -> ${filename}.html`);
  return { html };
}

async function dismiss(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

async function main() {
  console.log("=== Scraping Checking Account, Add Transaction, & Reconcile Modals ===");
  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  // 1. CHASE CHECKING
  console.log(`Navigating to Chase Checking: ${CHECKING_URL} ...`);
  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ynab-grid, .accounts-header", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Capture Header balances & Toolbar
  await captureElement(page, ".accounts-header", "Checking Account Balances (Cleared $7,515.87)", "checking_account_header");
  await captureElement(page, ".accounts-toolbar", "Account Register Toolbar", "account_register_toolbar");
  await captureElement(page, ".ynab-grid", "Checking Transaction Register Grid", "checking_transaction_grid");

  // Click 'Add Transaction' button
  console.log("Clicking 'Add Transaction' button...");
  const addTxBtn = await page.$("button:has-text('Add Transaction'), button.button-add-transaction, .accounts-toolbar-add-transaction");
  if (addTxBtn) {
    await addTxBtn.click();
    await page.waitForTimeout(800);
    await captureElement(page, ".ynab-grid-add-rows, .is-editing", "Add Transaction Inline Row Editor", "add_transaction_form_inline");
    await dismiss(page);
  }

  // Click 'Reconcile' button
  console.log("Clicking 'Reconcile' button...");
  const reconcileBtn = await page.$("button:has-text('Reconcile'), .button-reconcile");
  if (reconcileBtn) {
    await reconcileBtn.click();
    await captureModalOrPopup(page, "Reconcile Step 1 (Confirm Balance Prompt)", "modal_reconcile_step1_confirm");

    // Click 'No' to trigger discrepancy adjustment prompt
    console.log("Clicking 'No' to trigger discrepancy dialog...");
    const noBtn = await page.$(".modal-overlay.active button:has-text('No'), button:has-text('No')");
    if (noBtn) {
      await noBtn.click();
      await captureModalOrPopup(page, "Reconcile Step 2 (Discrepancy Input & Adjustment)", "modal_reconcile_step2_discrepancy");
    }
    await dismiss(page);
  }

  // 2. VISA REWARDS (Credit Card)
  console.log(`\nNavigating to Visa Rewards Credit Card: ${VISA_URL} ...`);
  await page.goto(VISA_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ynab-grid, .accounts-header", { timeout: 30000 });
  await page.waitForTimeout(2000);

  await captureElement(page, ".accounts-header", "Credit Card Account Header (Balance -$274.88)", "credit_card_account_header");
  await captureElement(page, ".ynab-grid", "Credit Card Transaction Register Grid", "credit_card_transaction_grid");

  if (!isCDP) {
    await context.close();
  }

  console.log("\n✔ Done capturing checking, credit card, and reconcile modals!");
}

main().catch(console.error);
