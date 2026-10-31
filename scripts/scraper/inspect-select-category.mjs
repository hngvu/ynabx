import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // 1. Check budget table header checkbox
  console.log("--- 1. Checking Budget Table Header Checkbox ---");
  const headerCheckbox = page.locator(".budget-table-header .ynab-checkbox-button, .budget-table-header-cell-checkbox button").first();
  console.log("Header checkbox count:", await headerCheckbox.count());

  // Click header checkbox (Select All)
  await headerCheckbox.click();
  await page.waitForTimeout(1000);

  const afterHeaderClick = await page.evaluate(() => {
    const inspector = document.querySelector(".budget-inspector");
    return {
      header: inspector?.querySelector(".budget-inspector-header, h2, h1")?.textContent?.trim(),
      text: inspector?.textContent?.slice(0, 300)
    };
  });
  console.log("After clicking header checkbox (Select All):", JSON.stringify(afterHeaderClick, null, 2));
  await page.screenshot({ path: "scripts/scraper/output/test_select_all_categories.png" });

  // 2. Select 2-3 specific categories
  // Uncheck header
  await headerCheckbox.click();
  await page.waitForTimeout(500);

  console.log("\n--- 2. Checking multiple category selection ---");
  const catCheckboxes = page.locator(".budget-table-row.is-sub-category .ynab-checkbox-button");
  console.log("Subcategory checkboxes count:", await catCheckboxes.count());
  await catCheckboxes.nth(0).click();
  await catCheckboxes.nth(1).click();
  await page.waitForTimeout(1000);

  const multipleSelectedState = await page.evaluate(() => {
    const inspector = document.querySelector(".budget-inspector");
    return {
      header: inspector?.querySelector(".budget-inspector-header, h2, h1")?.textContent?.trim(),
      text: inspector?.textContent?.slice(0, 400)
    };
  });
  console.log("Multiple categories selected in Inspector:", multipleSelectedState);
  await page.screenshot({ path: "scripts/scraper/output/test_multiple_categories_selected.png" });

  // 3. Check 1 single category selected
  await catCheckboxes.nth(1).click(); // uncheck second
  await page.waitForTimeout(1000);
  const singleSelectedState = await page.evaluate(() => {
    const inspector = document.querySelector(".budget-inspector");
    return {
      header: inspector?.querySelector(".budget-inspector-header, h2, h1")?.textContent?.trim(),
      text: inspector?.textContent?.slice(0, 400)
    };
  });
  console.log("Single category selected in Inspector:", singleSelectedState);
  await page.screenshot({ path: "scripts/scraper/output/test_single_category_selected.png" });

  // 4. Check Move Money Popover Category Select
  console.log("\n--- 4. Checking Move Money Category Selector ---");
  const availPill = page.locator(".budget-table-row.is-sub-category .ynab-new-budget-available-number").first();
  await availPill.click();
  await page.waitForTimeout(1000);

  const moveMoneyState = await page.evaluate(() => {
    const modal = document.querySelector(".modal-overlay.active");
    if (!modal) return "no move money modal";
    return {
      text: modal.textContent?.slice(0, 300)
    };
  });
  console.log("Move Money Popover controls:", moveMoneyState);

  // Check what trigger exists for category selection inside Move Money
  const toCatTrigger = page.locator(".modal-overlay.active select, .modal-overlay.active [class*='select'], .modal-overlay.active button:has-text('Select Category')").first();
  console.log("Destination category trigger count:", await toCatTrigger.count());
  if (await toCatTrigger.count() > 0) {
    const tag = await toCatTrigger.evaluate(el => el.tagName);
    console.log("Trigger tag is:", tag);
    if (tag === "SELECT") {
      const options = await toCatTrigger.evaluate(el => Array.from(el.querySelectorAll("option")).map(o => o.text));
      console.log("Move Money SELECT options count:", options.length, "Sample options:", options.slice(0, 10));
    } else {
      await toCatTrigger.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "scripts/scraper/output/test_move_money_category_dropdown.png" });
    }
  }

  await context.close();
}

main().catch(console.error);
