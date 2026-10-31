import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const ACCOUNTS_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    console.log("Navigating to Accounts page...");
    await page.goto(ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // 1. Click View button
    console.log("Clicking View options button...");
    const viewBtn = page.locator("button.accounts-toolbar-view-options");
    await viewBtn.click();
    await page.waitForTimeout(800);

    const viewModal = await page.evaluate(() => {
      // Find modal / popover
      const popovers = Array.from(document.querySelectorAll(".modal-overlay, .modal-popup, .modal-container, .popover, .dropdown-menu, .ember-view[class*='view-options'], .ember-view[class*='popover'], .modal-content, [role='dialog'], [role='menu']")).map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        html: el.outerHTML
      }));
      return popovers;
    });
    console.log("Found modal elements for View options:", viewModal.length);
    if (viewModal.length > 0) {
      console.log(viewModal.map(m => ({ className: m.className, id: m.id })));
    }

    // 2. Click Search input and type something
    console.log("Clicking Search input...");
    const searchInput = page.locator("input.transaction-search-input");
    await searchInput.click();
    await page.waitForTimeout(500);

    const searchEmptyFocus = await page.evaluate(() => {
      const popovers = Array.from(document.querySelectorAll(".search-menu, .autocomplete-menu, .modal-overlay, .modal-popup, .popover, [role='listbox'], [role='menu'], .transaction-search-menu")).map(el => ({
        className: el.className,
        id: el.id
      }));
      return popovers;
    });
    console.log("Search dropdown when focused empty:", searchEmptyFocus);

    // Type a keyword to see search suggestions dropdown
    await searchInput.fill("Groceries");
    await page.waitForTimeout(800);

    const searchTypedFocus = await page.evaluate(() => {
      const popovers = Array.from(document.querySelectorAll(".search-menu, .autocomplete-menu, .modal-overlay, .modal-popup, .popover, [role='listbox'], [role='menu'], .transaction-search-menu, [class*='search']")).map(el => ({
        className: el.className,
        id: el.id,
        text: el.textContent?.trim().slice(0, 50)
      }));
      return popovers;
    });
    console.log("Search dropdown when typed:", searchTypedFocus);

  } finally {
    await context.close();
  }
}

main().catch(console.error);
