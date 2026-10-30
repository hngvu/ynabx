import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // 1. ADD CATEGORY GROUP
  console.log("\n1. Testing + Category Group...");
  const addGroupBtn = page.locator("button:has-text('Category Group')").first();
  await addGroupBtn.click();
  await page.waitForTimeout(500);
  let modal1 = await page.evaluate(() => {
    const el = document.querySelector(".modal-overlay.active");
    return el ? { class: el.className, text: el.innerText.replace(/\n+/g, " ") } : null;
  });
  console.log("Add Group Modal:", modal1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 2. ADD CATEGORY TO GROUP
  console.log("\n2. Testing Add Category to Group (+) button on Bills...");
  const masterRow = page.locator(".budget-table-row.is-master-category").filter({ hasText: "Bills" }).first();
  await masterRow.hover();
  await page.waitForTimeout(400);
  const addCatBtn = masterRow.locator("button.budget-table-cell-add-category").first();
  await addCatBtn.click();
  await page.waitForTimeout(500);
  let modal2 = await page.evaluate(() => {
    const el = document.querySelector(".modal-overlay.active");
    return el ? { class: el.className, text: el.innerText.replace(/\n+/g, " ") } : null;
  });
  console.log("Add Category Modal:", modal2);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 3. EDIT CATEGORY GROUP
  console.log("\n3. Testing Edit Category Group (clicking 'Bills' text)...");
  const editGroupBtn = masterRow.locator("button.budget-table-cell-edit-category, button[title='Bills']").first();
  await editGroupBtn.click();
  await page.waitForTimeout(500);
  let modal3 = await page.evaluate(() => {
    const el = document.querySelector(".modal-overlay.active");
    return el ? { class: el.className, text: el.innerText.replace(/\n+/g, " "), html: el.outerHTML.slice(0, 300) } : null;
  });
  console.log("Edit Group Modal:", modal3);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 4. EDIT CATEGORY
  console.log("\n4. Testing Edit Category (clicking category edit in inspector or on row)...");
  const subRow = page.locator(".budget-table-row.is-sub-category").filter({ hasText: "Rent" }).first();
  await subRow.click();
  await page.waitForTimeout(500);

  const editCatBtn = page.locator(".inspector-category-edit, button[aria-label*='Edit category']").first();
  if (await editCatBtn.count() > 0) {
    await editCatBtn.click();
    await page.waitForTimeout(500);
    let modal4 = await page.evaluate(() => {
      const el = document.querySelector(".modal-overlay.active");
      return el ? { class: el.className, text: el.innerText.replace(/\n+/g, " ") } : null;
    });
    console.log("Edit Category Modal from Inspector:", modal4);
  }

  // Also check double-click or clicking category name directly
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  console.log("Testing click directly on category name button...");
  const catNameBtn = subRow.locator(".budget-table-cell-name button").first();
  await catNameBtn.click();
  await page.waitForTimeout(500);
  let modal5 = await page.evaluate(() => {
    const el = document.querySelector(".modal-overlay.active");
    return el ? { class: el.className, text: el.innerText.replace(/\n+/g, " ") } : null;
  });
  console.log("Direct Category Click Modal:", modal5);

  await context.close();
}

main().catch(console.error);
