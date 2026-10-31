import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const ACCOUNTS_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const searchInput = page.locator("input.transaction-search-input");
    await searchInput.fill("Rent");
    await page.waitForTimeout(800);

    // Click the first recommendation
    const firstRec = page.locator(".transaction-search-recommendations button").first();
    await firstRec.click();
    await page.waitForTimeout(800);

    const filterState = await page.evaluate(() => {
      const container = document.querySelector(".transaction-search");
      const chips = Array.from(document.querySelectorAll(".search-chip, .filter-chip, .tag, .pill, [class*='search']")).map(e => ({
        className: e.className,
        text: e.textContent?.trim()
      }));
      return {
        containerHtml: container.outerHTML,
        chips: chips.filter(c => c.text)
      };
    });

    console.log("Applied filter container HTML:\n", filterState.containerHtml);
    await page.screenshot({ path: "scripts/scraper/output/test_plan_modals/accounts_search_filter_applied.png" });

  } finally {
    await context.close();
  }
}

main().catch(console.error);
