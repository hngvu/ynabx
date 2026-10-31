import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;
const CHECKING_ID = "ddd417e8-d4c9-4981-ad15-4c61c5d7ccc4";
const CHECKING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/${CHECKING_ID}`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });

  // 1. Move Money category dropdown in Budget
  console.log("Navigating to Budget page for Move Money...");
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Click an available pill to open Move Money
  const availPill = page.locator(".budget-table-row.is-sub-category .ynab-new-budget-available-number").filter({ hasText: "$" }).first();
  await availPill.click();
  await page.waitForTimeout(800);

  const moveModal = page.locator(".modal-overlay.active, .modal-budget-move-money").first();
  console.log("Move Money modal found:", await moveModal.count());

  // Check what input/select exists inside Move Money
  const moveControls = await moveModal.evaluate(el => {
    return Array.from(el.querySelectorAll("select, button, input, div[role='combobox'], [class*='select']")).map(b => ({
      tag: b.tagName,
      className: b.className,
      text: b.innerText?.trim(),
      html: b.outerHTML.slice(0, 200)
    }));
  });
  console.log("Move Money controls:", JSON.stringify(moveControls, null, 2));

  // Try clicking the destination category dropdown
  const toSelect = moveModal.locator("select, button.button-select-category, [class*='select']").first();
  if (await toSelect.count() > 0) {
    const isSelect = await toSelect.evaluate(el => el.tagName === "SELECT");
    console.log("Is destination category a <select> tag?", isSelect);
    if (isSelect) {
      const opts = await toSelect.evaluate(el => Array.from(el.querySelectorAll("option")).map(o => o.text.trim()));
      console.log("Select options sample:", opts.slice(0, 15));
    } else {
      await toSelect.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: "scripts/scraper/output/test_move_money_category_open.png" });
    }
  }

  // 2. Action Bar Categorize flyout submenu in Accounts register
  console.log("\nNavigating to Checking register for Action Bar Categorize submenu...");
  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Select 1 transaction
  const txCb = page.locator(".ynab-grid-body .ynab-grid-cell-checkbox button").first();
  await txCb.click();
  await page.waitForTimeout(800);

  const categorizeBtn = page.locator(".register-action-bar-container button:has-text('Categorize')").first();
  await categorizeBtn.click();
  await page.waitForTimeout(600);

  // Hover on "Bills" in the categorize menu
  const billsMenu = page.locator(".modal-overlay.active li, .modal-overlay.active button").filter({ hasText: "Bills" }).first();
  console.log("Bills menu item count:", await billsMenu.count());
  if (await billsMenu.count() > 0) {
    await billsMenu.hover();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "scripts/scraper/output/test_action_bar_categorize_flyout.png" });
    console.log("Captured test_action_bar_categorize_flyout.png");

    const flyoutHtml = await page.evaluate(() => {
      const active = Array.from(document.querySelectorAll(".modal-overlay.active, .dropdown-menu, .modal-popup, [role='menu']"));
      return active.map(el => ({ class: el.className, text: el.innerText }));
    });
    console.log("Active menus during hover:", flyoutHtml);
  }

  await context.close();
}

main().catch(console.error);
