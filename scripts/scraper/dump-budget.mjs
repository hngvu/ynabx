import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Extracts element outerHTML and its computed styles
 */
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
    await el.screenshot({ path: path.join(outDir, `${name}.png`) });
  } catch (err) {
    // Ignore screenshot errors for 0-height or detached elements
  }

  console.log(`  ✔ Extracted: ${name} (${selector})`);
  return { html, styles };
}

async function main() {
  const targetDir = path.join(OUTPUT_DIR, "budget");
  await ensureDir(targetDir);

  console.log("=== Dumping YNAB Budget View ===");
  const { context, page, isCDP } = await getBrowserContext({ headless: false });

  console.log("Navigating to YNAB Budget...");
  await page.goto("https://app.ynab.com", { waitUntil: "domcontentloaded" });

  // Wait for budget view to mount
  console.log("Waiting for budget view elements...");
  await page.waitForSelector(".budget-header, .budget-table, .nav-main", { timeout: 30000 });

  // Wait extra 2s for all animations / data fetches to settle
  await page.waitForTimeout(2000);

  // 1. Full page snapshot & screenshot
  console.log("Saving full budget page snapshot...");
  const fullHtml = await page.content();
  fs.writeFileSync(path.join(targetDir, "full_page.html"), fullHtml, "utf8");
  await page.screenshot({ path: path.join(targetDir, "full_page.png"), fullPage: true });

  // 2. Extract CSS Custom Properties (Theme variables)
  console.log("Extracting CSS Custom Properties (Theme)...");
  const rootVars = await page.evaluate(() => {
    const vars = {};
    const computed = window.getComputedStyle(document.documentElement);
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith("--")) {
        vars[prop] = computed.getPropertyValue(prop).trim();
      }
    }
    return vars;
  });
  fs.writeFileSync(path.join(targetDir, "theme_variables.json"), JSON.stringify(rootVars, null, 2), "utf8");

  // 3. Extract core components
  console.log("Extracting core components...");
  await extractComponent(page, ".nav-main, nav.sidebar", "sidebar", targetDir);
  await extractComponent(page, ".budget-header", "budget_header", targetDir);
  await extractComponent(page, ".budget-header-totals, .to-be-budgeted", "ready_to_assign_banner", targetDir);
  await extractComponent(page, ".budget-table", "budget_table", targetDir);
  await extractComponent(page, ".budget-table-header", "budget_table_header", targetDir);
  await extractComponent(page, ".budget-table-row:not(.is-master-category)", "sample_category_row", targetDir);
  await extractComponent(page, ".budget-table-row.is-master-category", "sample_master_category_row", targetDir);
  await extractComponent(page, ".budget-inspector", "budget_inspector", targetDir);

  // 4. Try interacting: Click first subcategory row to open inspector details
  console.log("Selecting a subcategory row to inspect category details...");
  const catRow = await page.$(".budget-table-row:not(.is-master-category)");
  if (catRow) {
    await catRow.click();
    await page.waitForTimeout(800);
    await extractComponent(page, ".budget-inspector", "inspector_category_selected", targetDir);
  }

  // 5. Try interacting: Open Ready to Assign breakdown popup
  console.log("Attempting to open Ready To Assign popover...");
  const rtaPill = await page.$(".to-be-budgeted, .budget-header-totals-amount");
  if (rtaPill) {
    await rtaPill.click();
    await page.waitForTimeout(800);
    await extractComponent(page, ".modal-container, .modal-popup, .ember-modal-dialog", "rta_breakdown_modal", targetDir);
    // Press Escape to dismiss
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  console.log(`\n✔ Budget dump completed! Files saved to:\n  ${targetDir}\n`);

  if (!isCDP) {
    await context.close();
  }
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
