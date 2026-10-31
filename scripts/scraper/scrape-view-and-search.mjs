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
      overflow: hidden;
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

async function scrapeViewAndSearch() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    console.log("Navigating to Accounts page...");
    await page.goto(ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // ==========================================
    // 1. SCRAPE VIEW OPTIONS MODAL
    // ==========================================
    console.log("1. Opening View Options popover...");
    const viewBtn = page.locator("button.accounts-toolbar-view-options");
    await viewBtn.click();
    await page.waitForTimeout(800);

    // Locate the modal
    const viewModalLocator = page.locator(".modal-account-view-options, .modal-generic");
    if (await viewModalLocator.count() > 0) {
      console.log("Found View Options modal!");
      const modalBox = await page.locator(".modal-account-view-options .modal, .modal-generic .modal").first();
      
      const viewModalHtml = await modalBox.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "modal_account_view_options.html"), viewModalHtml);

      // Screenshot of just the modal
      await modalBox.screenshot({ path: path.join(OUTPUT_DIR, "modal_account_view_options.png") });

      // Screenshot with in-context toolbar
      await page.screenshot({ path: path.join(OUTPUT_DIR, "accounts_page_view_options_open.png") });

      // Styled standalone preview
      const previewHtml = wrapInPreview(viewModalHtml, "Accounts View Settings / Options", 320);
      fs.writeFileSync(path.join(OUTPUT_DIR, "modal_account_view_options_preview.html"), previewHtml);
      console.log("Saved modal_account_view_options files.");
    }

    // Close view options modal by pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // ==========================================
    // 2. SCRAPE SEARCH COMPONENT & AUTOCOMPLETE DROPDOWN
    // ==========================================
    console.log("2. Interacting with Transaction Search...");
    const searchContainer = page.locator(".transaction-search");
    const searchInput = page.locator("input.transaction-search-input");

    // Scrape default search bar in toolbar
    const searchBarHtml = await searchContainer.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_bar.html"), searchBarHtml);
    await searchContainer.screenshot({ path: path.join(OUTPUT_DIR, "transaction_search_bar.png") });

    // Focus into search input to see if empty menu appears or how it looks
    await searchInput.click();
    await page.waitForTimeout(500);
    await searchContainer.screenshot({ path: path.join(OUTPUT_DIR, "transaction_search_focused.png") });

    // Type a keyword to trigger search suggestion dropdown
    console.log("Typing search query 'Groceries'...");
    await searchInput.fill("Groceries");
    await page.waitForTimeout(1000);

    // Check if dropdown appeared in DOM
    const searchDropdown = await page.evaluate(() => {
      // Look for any newly created dropdown or menu
      const els = Array.from(document.querySelectorAll(".search-menu, .autocomplete-menu, .modal-overlay, .dropdown-menu, .ember-view[class*='search'], [role='listbox']"));
      const visible = els.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && el !== document.querySelector(".transaction-search");
      });
      if (visible.length > 0) {
        return {
          selector: visible[0].className,
          html: visible[0].outerHTML
        };
      }
      return null;
    });

    console.log("Search dropdown detected:", searchDropdown ? searchDropdown.selector : "No separate dropdown element");

    // Capture screenshot of toolbar with search filled
    await page.screenshot({ path: path.join(OUTPUT_DIR, "accounts_search_query_active.png") });

    if (searchDropdown) {
      fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_dropdown.html"), searchDropdown.html);
      const previewSearchMenu = wrapInPreview(searchDropdown.html, "Transaction Search Suggestions Dropdown", 400);
      fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_dropdown_preview.html"), previewSearchMenu);
    }

    // Try typing filter prefixes like "category:" or "payee:" or "date:"
    console.log("Typing search filter query 'category:'...");
    await searchInput.fill("category:");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "accounts_search_category_filter.png") });

    const filterDropdown = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll(".search-menu, .autocomplete-menu, .modal-overlay, .dropdown-menu, .ember-view[class*='search'], [role='listbox'], .transaction-search-menu"));
      const visible = els.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return visible.map(v => ({ className: v.className, html: v.outerHTML }));
    });
    console.log("Filter query dropdowns found:", filterDropdown.map(f => f.className));

    if (filterDropdown.length > 0) {
      fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_filter_dropdown.html"), filterDropdown[0].html);
      fs.writeFileSync(path.join(OUTPUT_DIR, "transaction_search_filter_dropdown_preview.html"), wrapInPreview(filterDropdown[0].html, "Transaction Search Filter Dropdown", 380));
    }

    console.log("Scrape completed successfully!");
  } finally {
    await context.close();
  }
}

scrapeViewAndSearch().catch(console.error);
