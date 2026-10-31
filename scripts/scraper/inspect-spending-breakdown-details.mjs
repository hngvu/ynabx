import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(`https://app.ynab.com/${TEST_PLAN_ID}/reflect/age-of-money`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Click Spending Breakdown button
    console.log("Clicking Spending Breakdown tab/button...");
    const spendingBtn = page.locator("button:has-text('Spending Breakdown')").first();
    await spendingBtn.click();
    await page.waitForTimeout(3000);
    console.log("Current URL:", page.url());

    // Examine all elements on this page
    const pageStructure = await page.evaluate(() => {
      // Find all buttons, filters, headers, categories, tables
      const filters = Array.from(document.querySelectorAll("button, .reports-header, .filters, .reports-filter, .pure-u, [role='button']")).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.trim().slice(0, 50),
        aria: el.getAttribute("aria-label")
      }));

      // Find all rows in category table
      const rows = Array.from(document.querySelectorAll("tr, .category-row, .category-group, .reports-table-row, [class*='category'], [class*='row']")).map(r => ({
        className: r.className,
        text: r.textContent?.trim().slice(0, 60)
      }));

      return {
        filters: filters.filter(f => /filter|time|date|category|account|all|select/i.test(f.text || '') || /filter|dropdown/i.test(f.className)),
        rowsCount: rows.length,
        sampleRows: rows.slice(0, 15)
      };
    });

    console.log("Filters:\n", JSON.stringify(pageStructure.filters, null, 2));
    console.log("Sample Rows:\n", JSON.stringify(pageStructure.sampleRows, null, 2));

    await page.screenshot({ path: "scripts/scraper/output/reports/debug_reflect_spending_page.png" });

  } finally {
    await context.close();
  }
}

main().catch(console.error);
