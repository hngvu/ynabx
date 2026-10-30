import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // 1. Double click on "Bills" group name
  console.log("Testing double-click on 'Bills' group name...");
  const billsText = page.locator(".budget-table-row.is-master-category .name", { hasText: "Bills" }).first();
  await billsText.dblclick();
  await page.waitForTimeout(1000);

  let modal = await page.evaluate(() => {
    const m = document.querySelector(".modal-overlay.active");
    return m ? { class: m.className, text: m.innerText } : null;
  });
  console.log("After dblclick on Bills:", modal);

  if (!modal) {
    // Try single click on Bills
    console.log("Testing single-click on Bills...");
    await billsText.click();
    await page.waitForTimeout(1000);
    modal = await page.evaluate(() => {
      const m = document.querySelector(".modal-overlay.active");
      return m ? { class: m.className, text: m.innerText } : null;
    });
    console.log("After single-click on Bills:", modal);
  }

  // 2. Check if there's an edit button on group row or in inspector
  console.log("\nChecking inspector when Bills is selected...");
  const inspectorButtons = await page.evaluate(() => {
    const insp = document.querySelector(".budget-inspector");
    if (!insp) return "no inspector";
    return Array.from(insp.querySelectorAll("button")).map(b => ({
      class: b.className,
      ariaLabel: b.getAttribute("aria-label"),
      text: b.innerText.trim()
    }));
  });
  console.log("Inspector buttons:", JSON.stringify(inspectorButtons, null, 2));

  // 3. Try right-click (context menu) on Bills
  console.log("\nTesting right-click on Bills...");
  await billsText.click({ button: "right" });
  await page.waitForTimeout(1000);
  const contextMenu = await page.evaluate(() => {
    const m = document.querySelector(".modal-overlay.active, [role='menu']");
    return m ? { class: m.className, text: m.innerText } : null;
  });
  console.log("After right-click on Bills:", contextMenu);

  // 4. Try hovering and looking for hidden edit icon on Bills
  const hoverCheck = await billsText.evaluate(el => {
    const parent = el.closest(".budget-table-row");
    return Array.from(parent.querySelectorAll("*")).map(child => ({
      tag: child.tagName,
      class: child.className,
      ariaLabel: child.getAttribute("aria-label"),
      title: child.getAttribute("title")
    })).filter(c => c.ariaLabel || c.title || c.class.includes("edit") || c.class.includes("button"));
  });
  console.log("Bills row interactive children:", hoverCheck);

  await context.close();
}

main().catch(console.error);
