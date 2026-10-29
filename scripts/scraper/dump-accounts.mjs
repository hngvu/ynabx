import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function extractComponent(page, selector, name, outDir) {
  const el = await page.$(selector);
  if (!el) {
    console.warn(`[Skip] Element not found: ${selector}`);
    return null;
  }

  const html = await el.evaluate((node) => node.outerHTML);
  const styles = await el.evaluate((node) => {
    const computed = window.getComputedStyle(node);
    const result = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      result[prop] = computed.getPropertyValue(prop);
    }
    return result;
  });

  fs.writeFileSync(path.join(outDir, `${name}.html`), html, "utf8");
  fs.writeFileSync(path.join(outDir, `${name}-styles.json`), JSON.stringify(styles, null, 2), "utf8");

  try {
    await el.screenshot({ path: path.join(outDir, `${name}.png`), timeout: 5000 });
  } catch (err) {}

  console.log(`  ✔ Extracted: ${name} (${selector})`);
  return { html, styles };
}

async function main() {
  const targetDir = path.join(OUTPUT_DIR, "accounts");
  await ensureDir(targetDir);

  console.log("=== Dumping YNAB Accounts View ===");
  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  console.log("Navigating to YNAB...");
  await page.goto("https://app.ynab.com", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nav-main", { timeout: 30000 });

  // Look for a specific account first (so Add Transaction and Reconcile are enabled)
  console.log("Finding an account in sidebar...");
  const accountLink = await page.$(
    ".nav-account-row a, .nav-accounts a.nav-account-item:not([href*='/accounts/all'])"
  );

  if (accountLink) {
    console.log("Navigating to single account register...");
    await accountLink.click();
    await page.waitForTimeout(2000);
  } else {
    // Fallback: navigate to All Accounts
    console.log("Navigating to All Accounts page...");
    const allAccountsLink = await page.$("a[href*='/accounts']");
    if (allAccountsLink) {
      await allAccountsLink.click();
      await page.waitForTimeout(2000);
    }
  }

  // 1. Full page snapshot
  console.log("Saving full accounts register snapshot...");
  const fullHtml = await page.content();
  fs.writeFileSync(path.join(targetDir, "full_page.html"), fullHtml, "utf8");
  await page.screenshot({ path: path.join(targetDir, "full_page.png"), fullPage: true });

  // 2. Extract Header & Register Components
  console.log("Extracting account register components...");
  await extractComponent(page, ".accounts-header, .header-account", "accounts_header", targetDir);
  await extractComponent(page, ".accounts-toolbar", "accounts_toolbar", targetDir);
  await extractComponent(page, ".ynab-grid-header, .register-table-header", "grid_header", targetDir);
  await extractComponent(page, ".ynab-grid-body, .register-table-body", "grid_body", targetDir);
  await extractComponent(page, ".ynab-grid-cell, .register-table-row", "sample_row", targetDir);

  // 3. Click 'Add Transaction' button
  console.log("Checking 'Add Transaction' button...");
  const addTxBtn = await page.$(
    "button:has-text('Add Transaction'), button.button-add-transaction, .accounts-toolbar-add-transaction"
  );
  if (addTxBtn) {
    const isEnabled = await addTxBtn.isEnabled().catch(() => false);
    if (isEnabled) {
      console.log("Clicking 'Add Transaction' button...");
      await addTxBtn.click();
      await page.waitForTimeout(800);
      await extractComponent(
        page,
        ".ynab-grid-add-rows, .register-edit-form, .is-editing",
        "add_transaction_form",
        targetDir
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    } else {
      console.log("[Note] 'Add Transaction' button is currently disabled in this view.");
    }
  }

  // 4. Click 'Reconcile' button
  console.log("Checking 'Reconcile' button...");
  const reconcileBtn = await page.$("button:has-text('Reconcile'), .button-reconcile");
  if (reconcileBtn) {
    const isEnabled = await reconcileBtn.isEnabled().catch(() => false);
    if (isEnabled) {
      console.log("Clicking 'Reconcile' button...");
      await reconcileBtn.click();
      await page.waitForTimeout(800);
      await extractComponent(
        page,
        ".modal-container, .modal-reconcile, .ember-modal-dialog",
        "reconcile_modal",
        targetDir
      );
      await page.keyboard.press("Escape");
    } else {
      console.log("[Note] 'Reconcile' button is currently disabled or not available in this view.");
    }
  }

  console.log(`\n✔ Accounts dump completed! Files saved to:\n  ${targetDir}\n`);

  if (!isCDP) {
    await context.close();
  }
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
