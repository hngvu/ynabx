import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const ACCOUNTS_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts`;
const OUTPUT_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

function wrapInPreview(html, title, width = 360) {
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
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      position: relative;
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
    console.log("Navigating to Accounts page...");
    await page.goto(ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const searchInput = page.locator("input.transaction-search-input");
    const searchContainer = page.locator(".transaction-search");

    // 1. Initial Empty Search State
    console.log("Scraping Initial Empty Search State...");
    const emptySearchHtml = await searchContainer.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_empty.html"), emptySearchHtml);
    await searchContainer.screenshot({ path: path.join(OUTPUT_DIR, "transaction_search_empty.png") });
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_empty_preview.html"), wrapInPreview(emptySearchHtml, "Transaction Search - Initial State", 320));

    // 2. Focused Empty Search State
    console.log("Focusing search input...");
    await searchInput.click();
    await page.waitForTimeout(400);
    const focusedSearchHtml = await searchContainer.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_focused.html"), focusedSearchHtml);
    await searchContainer.screenshot({ path: path.join(OUTPUT_DIR, "transaction_search_focused.png") });
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_focused_preview.html"), wrapInPreview(focusedSearchHtml, "Transaction Search - Focused", 320));

    // 3. Typing Query with Recommendations Menu Dropdown
    console.log("Typing 'Groceries' into search...");
    await searchInput.pressSequentially("Groceries", { delay: 60 });
    await page.waitForTimeout(600);

    // Capture dropdown and full search container
    const searchWithDropdownHtml = await searchContainer.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_with_recommendations.html"), searchWithDropdownHtml);
    await searchContainer.screenshot({ path: path.join(OUTPUT_DIR, "transaction_search_with_recommendations.png") });
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_with_recommendations_preview.html"), wrapInPreview(searchWithDropdownHtml, "Transaction Search with Autocomplete Recommendations", 360));

    // Capture screenshot of page with active search menu
    await page.screenshot({ path: path.join(OUTPUT_DIR, "accounts_page_search_recommendations.png") });

    // 4. Select a Recommendation (e.g. Find "Groceries" in the Category or Category: Groceries)
    console.log("Clicking recommendation...");
    const recButton = page.locator(".transaction-search-recommendations button").first();
    await recButton.click();
    await page.waitForTimeout(800);

    // Capture applied search token/tag state
    const filterAppliedHtml = await searchContainer.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_filter_applied.html"), filterAppliedHtml);
    await searchContainer.screenshot({ path: path.join(OUTPUT_DIR, "transaction_search_filter_applied.png") });
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_filter_applied_preview.html"), wrapInPreview(filterAppliedHtml, "Transaction Search - Filter Tag Applied", 360));
    await page.screenshot({ path: path.join(OUTPUT_DIR, "accounts_page_search_filter_applied.png") });

    console.log("All Search and View states successfully scraped and captured!");
  } finally {
    await context.close();
  }
}

main().catch(console.error);
