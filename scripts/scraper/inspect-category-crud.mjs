import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  console.log("Navigating to Budget page...");
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // 1. Inspect "+ Category Group" button
  console.log("\n--- Checking '+ Category Group' button ---");
  const addGroupBtn = page.locator("button:has-text('Category Group')").first();
  console.log("Add Category Group button found:", await addGroupBtn.count());

  await addGroupBtn.click();
  await page.waitForTimeout(1000);

  // Check what appeared (popover, modal, or inline row)
  const afterAddGroup = await page.evaluate(() => {
    const popups = Array.from(document.querySelectorAll(".modal-overlay, .modal-popup, .ember-view, .budget-table-row"))
      .filter(el => {
        const s = window.getComputedStyle(el);
        const isEditing = el.classList.contains("is-adding") || el.classList.contains("is-editing") || el.querySelector("input");
        const isPopup = (s.position === "absolute" || s.position === "fixed") && el.offsetWidth > 40 && el.offsetHeight > 30;
        return isEditing || isPopup;
      });
    return popups.slice(0, 10).map(el => ({
      tag: el.tagName,
      className: el.className,
      text: el.innerText.slice(0, 150),
      hasInput: !!el.querySelector("input"),
      inputVal: el.querySelector("input")?.value,
      inputPlaceholder: el.querySelector("input")?.placeholder
    }));
  });
  console.log("Elements after clicking + Category Group:", JSON.stringify(afterAddGroup, null, 2));

  // Take screenshot of + Category Group state
  await page.screenshot({ path: "scripts/scraper/output/test_category_group_click.png" });

  // 2. Check Category Group row hover/actions
  console.log("\n--- Checking Master Category (Group) Row Actions ---");
  const firstMasterRow = page.locator(".budget-table-row.is-master-category").first();
  await firstMasterRow.hover();
  await page.waitForTimeout(500);

  const groupActions = await page.evaluate(() => {
    const row = document.querySelector(".budget-table-row.is-master-category");
    if (!row) return "no master row";
    return Array.from(row.querySelectorAll("button, a, svg")).map(el => ({
      tag: el.tagName,
      className: el.className,
      title: el.getAttribute("title"),
      ariaLabel: el.getAttribute("aria-label"),
      text: el.innerText?.trim()
    }));
  });
  console.log("Group row buttons/actions on hover:", JSON.stringify(groupActions, null, 2));

  // Check if there is an Add Category button inside the group row
  const addCatBtn = firstMasterRow.locator("button[aria-label*='category' i], button[title*='category' i], button.budget-table-header-edit-category-group, button:has-text('+')").first();
  console.log("Add category to group button count:", await addCatBtn.count());

  // 3. Check Category row actions/hover
  console.log("\n--- Checking Sub-Category Row Actions ---");
  const firstSubRow = page.locator(".budget-table-row.is-sub-category").first();
  await firstSubRow.hover();
  await page.waitForTimeout(500);

  const catActions = await page.evaluate(() => {
    const row = document.querySelector(".budget-table-row.is-sub-category");
    if (!row) return "no sub row";
    return Array.from(row.querySelectorAll("button, a, svg")).map(el => ({
      tag: el.tagName,
      className: el.className,
      title: el.getAttribute("title"),
      ariaLabel: el.getAttribute("aria-label"),
      text: el.innerText?.trim()
    }));
  });
  console.log("Sub-category row buttons on hover:", JSON.stringify(catActions, null, 2));

  // What happens if we click on Category Name or double click or edit?
  console.log("Clicking on category name text...");
  const catNameBtn = firstSubRow.locator(".budget-table-cell-name button, .budget-table-cell-name").first();
  await catNameBtn.click();
  await page.waitForTimeout(1000);

  // Check inspector or popover
  const afterCatClick = await page.evaluate(() => {
    const modals = Array.from(document.querySelectorAll(".modal-overlay, .modal-popup, .popover, [role='dialog'], [role='menu']"))
      .filter(el => {
        const s = window.getComputedStyle(el);
        return (s.position === "absolute" || s.position === "fixed") && el.offsetWidth > 40;
      });
    return modals.map(m => ({
      className: m.className,
      text: m.innerText.slice(0, 150)
    }));
  });
  console.log("Modals/Popovers after clicking category name:", afterCatClick);

  await context.close();
}

main().catch(console.error);
