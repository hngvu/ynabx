import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const SPENDING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/reflect/spending-breakdown`;
const OUTPUT_DIR = path.resolve("scripts/scraper/output/reports");
const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

function wrapInPreview(html, title, width = 1100) {
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
      padding: 30px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-card {
      width: ${width}px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    }
  </style>
</head>
<body class="ember-application">
  <div class="preview-card">
    ${html}
  </div>
</body>
</html>`;
}

function wrapModalInPreview(html, title, width = 360) {
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
    .preview-card {
      width: ${width}px;
      position: relative;
    }
    .modal {
      position: static !important;
      display: block !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
    }
  </style>
</head>
<body class="ember-application">
  <div class="preview-card">
    ${html}
  </div>
</body>
</html>`;
}

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    console.log("Navigating to Spending Breakdown page...");
    await page.goto(SPENDING_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // ==========================================
    // 1. SCRAPE SPENDING BREAKDOWN: CATEGORIES VIEW
    // ==========================================
    console.log("1. Scraping Spending Breakdown (Categories view)...");
    const categoriesToggleBtn = page.locator("button.spending-breakdown-category-group-toggle__button:has-text('Categories')").first();
    await categoriesToggleBtn.click();
    await page.waitForTimeout(1000);

    const reflectContainer = page.locator(".reflect-spending-breakdown").first();
    const categoriesViewHtml = await reflectContainer.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "spending_breakdown_categories_view.html"), categoriesViewHtml);
    await reflectContainer.screenshot({ path: path.join(OUTPUT_DIR, "spending_breakdown_categories_view.png") });
    fs.writeFileSync(path.join(OUTPUT_DIR, "spending_breakdown_categories_view_preview.html"), wrapInPreview(categoriesViewHtml, "Reflect - Spending Breakdown (Categories)"));

    // Full page screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, "report_spending_breakdown_categories_full.png") });

    // ==========================================
    // 2. SCRAPE SPENDING BREAKDOWN: GROUPS VIEW
    // ==========================================
    console.log("2. Scraping Spending Breakdown (Groups view)...");
    const groupsToggleBtn = page.locator("button.spending-breakdown-category-group-toggle__button:has-text('Groups')").first();
    await groupsToggleBtn.click();
    await page.waitForTimeout(1000);

    const groupsViewHtml = await reflectContainer.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "spending_breakdown_groups_view.html"), groupsViewHtml);
    await reflectContainer.screenshot({ path: path.join(OUTPUT_DIR, "spending_breakdown_groups_view.png") });
    fs.writeFileSync(path.join(OUTPUT_DIR, "spending_breakdown_groups_view_preview.html"), wrapInPreview(groupsViewHtml, "Reflect - Spending Breakdown (Groups)"));

    // Full page screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, "report_spending_breakdown_groups_full.png") });

    // ==========================================
    // 3. SCRAPE CATEGORY FILTER POPOVER
    // ==========================================
    console.log("3. Scraping 'All Categories' filter popover...");
    const catFilterBtn = page.locator(".filter-button-categories").first();
    await catFilterBtn.click();
    await page.waitForTimeout(800);

    const catModalLocator = page.locator(".modal-reports-categories .modal").first();
    if (await catModalLocator.count() > 0) {
      const catModalHtml = await catModalLocator.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_filter_categories.html"), catModalHtml);
      await catModalLocator.screenshot({ path: path.join(OUTPUT_DIR, "popover_filter_categories.png") });
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_filter_categories_preview.html"), wrapModalInPreview(catModalHtml, "Filter by Categories Popover", 340));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "report_filter_categories_open.png") });
      console.log("Saved popover_filter_categories files.");
    }

    // Close category filter popover
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // ==========================================
    // 4. SCRAPE ACCOUNT FILTER POPOVER
    // ==========================================
    console.log("4. Scraping 'All Accounts' filter popover...");
    const accFilterBtn = page.locator(".filter-button-accounts").first();
    await accFilterBtn.click();
    await page.waitForTimeout(800);

    const accModalLocator = page.locator(".modal-reports-accounts .modal").first();
    if (await accModalLocator.count() > 0) {
      const accModalHtml = await accModalLocator.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_filter_accounts.html"), accModalHtml);
      await accModalLocator.screenshot({ path: path.join(OUTPUT_DIR, "popover_filter_accounts.png") });
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_filter_accounts_preview.html"), wrapModalInPreview(accModalHtml, "Filter by Accounts Popover", 340));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "report_filter_accounts_open.png") });
      console.log("Saved popover_filter_accounts files.");
    }

    // Close accounts filter popover
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // ==========================================
    // 5. SCRAPE TIMEFRAME DATE FILTER POPOVER
    // ==========================================
    console.log("5. Scraping Timeframe / Date Range filter popover...");
    const timeframeBtn = page.locator(".filter-button-timeframe").first();
    if (await timeframeBtn.count() > 0) {
      await timeframeBtn.click();
      await page.waitForTimeout(800);

      const timeModalLocator = page.locator(".modal-reports-timeframe .modal, .modal-reports-date .modal, .modal-generic .modal").first();
      if (await timeModalLocator.count() > 0) {
        const timeModalHtml = await timeModalLocator.evaluate(el => el.outerHTML);
        fs.writeFileSync(path.join(OUTPUT_DIR, "popover_filter_timeframe.html"), timeModalHtml);
        await timeModalLocator.screenshot({ path: path.join(OUTPUT_DIR, "popover_filter_timeframe.png") });
        fs.writeFileSync(path.join(OUTPUT_DIR, "popover_filter_timeframe_preview.html"), wrapModalInPreview(timeModalHtml, "Filter by Timeframe Popover", 340));
        await page.screenshot({ path: path.join(OUTPUT_DIR, "report_filter_timeframe_open.png") });
        console.log("Saved popover_filter_timeframe files.");
      }
    }

    console.log("All Reflect Spending Breakdown components scraped successfully!");

  } finally {
    await context.close();
  }
}

main().catch(console.error);
