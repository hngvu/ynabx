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
      background-color: rgba(0, 0, 0, 0.5);
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .modal-overlay {
      position: relative !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      inset: auto !important;
      background: transparent !important;
    }
    .modal {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      margin: auto !important;
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

  // 1. Click Add Account -> Step 1 (Add Accounts chooser modal)
  console.log("Clicking Add Account...");
  const addAccountBtn = page.locator("button:has-text('Add Account')").first();
  await addAccountBtn.click();

  const unlinkedBtn = page.locator("button:has-text('Add an Unlinked Account')").first();
  await unlinkedBtn.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(600);

  console.log("Scraping Step 1: Add Accounts Chooser Modal...");
  const modal1 = page.locator(".modal-overlay.active").first();
  const html1 = await modal1.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_account_choose.html"), html1, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_account_choose_preview.html"), wrapInPreview(html1, "Add Account - Choose Linked or Unlinked"), "utf8");
  await modal1.screenshot({ path: path.join(OUTPUT_DIR, "modal_add_account_choose.png") });
  console.log("✓ Saved modal_add_account_choose");

  // 2. Click "Add an Unlinked Account" -> Step 2 (Unlinked Account Form empty)
  console.log("Clicking 'Add an Unlinked Account'...");
  await unlinkedBtn.click();
  await page.waitForTimeout(1000);

  console.log("Scraping Step 2: Add Unlinked Account Form...");
  const modal2 = page.locator(".modal-overlay.active").first();
  const html2 = await modal2.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_unlinked_account.html"), html2, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_unlinked_account_preview.html"), wrapInPreview(html2, "Add Unlinked Account Form"), "utf8");
  await modal2.screenshot({ path: path.join(OUTPUT_DIR, "modal_add_unlinked_account.png") });
  console.log("✓ Saved modal_add_unlinked_account");

  // 3. Click "Select account type..." -> Step 3 (Select Account Type Modal)
  console.log("Clicking 'Select account type...'...");
  const selectTypeBtn = page.locator(".account-type-select-button").first();
  await selectTypeBtn.click();
  await page.waitForTimeout(1000);

  console.log("Scraping Step 3: Select Account Type Modal...");
  const modal3 = page.locator(".modal-overlay.active").first();
  const html3 = await modal3.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_select_account_type.html"), html3, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_select_account_type_preview.html"), wrapInPreview(html3, "Select Account Type Options"), "utf8");
  await modal3.screenshot({ path: path.join(OUTPUT_DIR, "modal_select_account_type.png") });
  console.log("✓ Saved modal_select_account_type");

  // 4. Click an account type, e.g. "Checking" or "Credit Card"
  console.log("Selecting 'Checking' account type...");
  const checkingOption = page.locator("button:has-text('Checking'), div:has-text('Checking')").filter({
    hasText: /^Checking$/
  }).first();

  if (await checkingOption.count() > 0) {
    await checkingOption.click();
  } else {
    // fallback locator
    await page.locator("button.account-type-option:has-text('Checking'), button:has-text('Checking')").first().click();
  }
  await page.waitForTimeout(1000);

  // Type a sample nickname and balance
  const nameInput = page.locator(".name-input").first();
  if (await nameInput.count() > 0) {
    await nameInput.fill("My Primary Checking");
  }
  const balanceInput = page.locator(".balance-input").first();
  if (await balanceInput.count() > 0) {
    await balanceInput.fill("1250.00");
  }
  await page.waitForTimeout(500);

  console.log("Scraping Step 4: Add Unlinked Account Form (Filled with Checking)...");
  const modal4 = page.locator(".modal-overlay.active").first();
  const html4 = await modal4.evaluate(el => el.outerHTML);
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_unlinked_account_filled.html"), html4, "utf8");
  fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_unlinked_account_filled_preview.html"), wrapInPreview(html4, "Add Unlinked Account - Configured"), "utf8");
  await modal4.screenshot({ path: path.join(OUTPUT_DIR, "modal_add_unlinked_account_filled.png") });
  console.log("✓ Saved modal_add_unlinked_account_filled");

  // Also test Credit Card selection to capture Credit Card specific fields (e.g. interest rate, APR prompt if any)
  console.log("Clicking type button again to test Credit Card selection...");
  await page.locator(".account-type-select-button").first().click();
  await page.waitForTimeout(1000);

  const creditCardOption = page.locator("button:has-text('Credit Card')").first();
  if (await creditCardOption.count() > 0) {
    await creditCardOption.click();
    await page.waitForTimeout(1000);
    const modalCC = page.locator(".modal-overlay.active").first();
    const htmlCC = await modalCC.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_unlinked_credit_card.html"), htmlCC, "utf8");
    fs.writeFileSync(path.join(OUTPUT_DIR, "modal_add_unlinked_credit_card_preview.html"), wrapInPreview(htmlCC, "Add Unlinked Credit Card Form"), "utf8");
    await modalCC.screenshot({ path: path.join(OUTPUT_DIR, "modal_add_unlinked_credit_card.png") });
    console.log("✓ Saved modal_add_unlinked_credit_card");
  }

  await context.close();
  console.log("\nAll Unlinked Account and Account Type components scraped successfully!");
}

main().catch(console.error);
