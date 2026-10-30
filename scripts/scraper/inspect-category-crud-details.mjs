import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // 1. Inspect Master Category (Group) row
  console.log("Hovering on Master Category row (Bills)...");
  const billsGroup = page.locator(".budget-table-row.is-master-category").filter({ hasText: "Bills" }).first();
  await billsGroup.hover();
  await page.waitForTimeout(600);

  // Dump all buttons/elements inside Bills row
  const billsButtons = await billsGroup.evaluate(el => {
    return Array.from(el.querySelectorAll("button, [role='button'], svg, .budget-table-cell-name *")).map(b => ({
      tag: b.tagName,
      className: b.className,
      ariaLabel: b.getAttribute("aria-label"),
      title: b.getAttribute("title"),
      text: b.innerText?.trim()
    }));
  });
  console.log("Bills group buttons:", JSON.stringify(billsButtons, null, 2));

  // Take screenshot of hovered group row
  await page.screenshot({ path: "scripts/scraper/output/test_group_hover.png" });

  // 2. Look for "+" button inside Bills group row to Add Category
  const addCategoryToGroupBtn = billsGroup.locator("button[aria-label*='category' i], button[title*='category' i], button.budget-table-header-add-category, button:has-text('+'), [class*='add']").first();
  console.log("Add category to group btn count:", await addCategoryToGroupBtn.count());

  if (await addCategoryToGroupBtn.count() > 0) {
    console.log("Clicking Add Category in group...");
    await addCategoryToGroupBtn.click();
    await page.waitForTimeout(1000);

    const afterAddCat = await page.evaluate(() => {
      const active = Array.from(document.querySelectorAll(".modal-overlay.active, .modal-popup, .is-adding, .is-editing, [class*='popover']"));
      return active.map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText.slice(0, 150),
        html: el.outerHTML.slice(0, 300)
      }));
    });
    console.log("After clicking add category to group:", JSON.stringify(afterAddCat, null, 2));
    await page.screenshot({ path: "scripts/scraper/output/test_add_category_click.png" });
  }

  // 3. Check Sub-category (e.g. Rent) row
  console.log("\nHovering on Sub-category row (Rent)...");
  const rentRow = page.locator(".budget-table-row.is-sub-category").filter({ hasText: "Rent" }).first();
  await rentRow.hover();
  await page.waitForTimeout(600);

  const rentButtons = await rentRow.evaluate(el => {
    return Array.from(el.querySelectorAll("button, [role='button'], svg")).map(b => ({
      tag: b.tagName,
      className: b.className,
      ariaLabel: b.getAttribute("aria-label"),
      title: b.getAttribute("title"),
      text: b.innerText?.trim()
    }));
  });
  console.log("Rent row buttons:", JSON.stringify(rentButtons, null, 2));

  // How to edit category? Is there a rename option, double click, or button?
  // Let's check inspector edit category button:
  await rentRow.click();
  await page.waitForTimeout(600);

  const editCategoryBtn = page.locator("button[aria-label*='Edit category' i], button:has-text('Edit category'), .inspector-category-edit").first();
  console.log("Inspector edit category btn count:", await editCategoryBtn.count());
  if (await editCategoryBtn.count() > 0) {
    await editCategoryBtn.click();
    await page.waitForTimeout(800);
    const catEditMenu = await page.evaluate(() => {
      const m = document.querySelector(".modal-overlay.active");
      return m ? { className: m.className, text: m.innerText } : null;
    });
    console.log("Inspector Edit Category Menu:", catEditMenu);
  }

  await context.close();
}

main().catch(console.error);
