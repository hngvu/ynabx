import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(`https://app.ynab.com/${TEST_PLAN_ID}/reflect/spending-breakdown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // 1. Click "All Categories" filter button
    console.log("1. Clicking 'All Categories' filter button...");
    const catBtn = page.locator(".filter-button-categories").first();
    await catBtn.click();
    await page.waitForTimeout(800);

    const catModal = await page.evaluate(() => {
      const modal = document.querySelector(".modal-overlay, .modal-popup, .modal-categories, .modal, .dropdown-menu, .popover, [role='dialog']");
      return modal ? { className: modal.className, text: modal.textContent?.trim().slice(0, 100) } : null;
    });
    console.log("Categories filter popover opened:", catModal);
    await page.screenshot({ path: "scripts/scraper/output/reports/debug_filter_categories_open.png" });

    // Close categories popover
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 2. Click "All Accounts" filter button
    console.log("2. Clicking 'All Accounts' filter button...");
    const accBtn = page.locator(".filter-button-accounts").first();
    await accBtn.click();
    await page.waitForTimeout(800);

    const accModal = await page.evaluate(() => {
      const modal = document.querySelector(".modal-overlay, .modal-popup, .modal-accounts, .modal, .dropdown-menu, .popover, [role='dialog']");
      return modal ? { className: modal.className, text: modal.textContent?.trim().slice(0, 100) } : null;
    });
    console.log("Accounts filter popover opened:", accModal);
    await page.screenshot({ path: "scripts/scraper/output/reports/debug_filter_accounts_open.png" });

    // Close accounts popover
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // 3. Click Groups toggle
    console.log("3. Clicking Groups toggle in Spending Breakdown...");
    const groupsToggleBtn = page.locator("button:has-text('Groups'), .segmented-control-button:has-text('Groups')").first();
    await groupsToggleBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "scripts/scraper/output/reports/debug_spending_breakdown_groups.png" });

    // 4. Click Categories toggle back
    console.log("4. Clicking Categories toggle back...");
    const catsToggleBtn = page.locator("button:has-text('Categories'), .segmented-control-button:has-text('Categories')").first();
    await catsToggleBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "scripts/scraper/output/reports/debug_spending_breakdown_categories.png" });

  } finally {
    await context.close();
  }
}

main().catch(console.error);
