import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".budget-table", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Select Groceries row
  console.log("1. Selecting Groceries row...");
  const grocRow = page.locator(".budget-table-row").filter({ hasText: "Groceries" }).first();
  await grocRow.click();
  await page.waitForTimeout(1000);

  // 2. Expand Auto-Assign card in Inspector
  console.log("2. Expanding Auto-Assign section in Inspector...");
  const autoAssignHeader = await page.$(".budget-breakdown-auto-assign .card-roll-up, .budget-breakdown-auto-assign button");
  if (autoAssignHeader) {
    await autoAssignHeader.click();
    await page.waitForTimeout(600);
    const autoAssignContent = await page.evaluate(() => {
      const card = document.querySelector(".budget-breakdown-auto-assign");
      return card ? card.outerHTML : "none";
    });
    console.log("Auto-Assign expanded HTML length:", autoAssignContent.length);
  }

  // 3. Test clicking 'Edit Target' in Inspector
  console.log("3. Testing 'Edit Target' button...");
  const editTargetBtn = await page.$("button:has-text('Edit Target')");
  if (editTargetBtn) {
    console.log("Clicking 'Edit Target'...");
    await editTargetBtn.click();
    await page.waitForTimeout(1000);
    const afterEditTarget = await page.evaluate(() => {
      // Look for target editor in inspector or modal
      const editor = document.querySelector(".target-editor, .budget-inspector-target-editor, [class*='target-editor'], .modal-overlay.active");
      return editor ? { className: editor.className, tag: editor.tagName, text: editor.innerText.slice(0, 300) } : "none";
    });
    console.log("Target editor after click:", afterEditTarget);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // 4. Test clicking Category Edit button in Inspector
  console.log("4. Testing Category Edit button in Inspector...");
  const catEditBtn = await page.$(".inspector-category-edit, button[aria-label*='Edit category']");
  if (catEditBtn) {
    console.log("Clicking category edit button...");
    await catEditBtn.click();
    await page.waitForTimeout(800);
    const catEditModal = await page.evaluate(() => {
      const m = document.querySelector(".modal-overlay.active, .modal-popup, .modal");
      return m ? { className: m.className, text: m.innerText.slice(0, 300) } : "none";
    });
    console.log("Category Edit Modal:", catEditModal);
    await page.keyboard.press("Escape");
  }

  // 5. Test clicking Assigned input in category row (Calculator mode)
  console.log("5. Testing Assigned input field...");
  const assignedCell = grocRow.locator(".budget-table-cell-budgeted").first();
  await assignedCell.click();
  await page.waitForTimeout(500);
  const assignedHtml = await assignedCell.evaluate(node => node.outerHTML);
  console.log("Assigned cell active HTML:", assignedHtml);

  await context.close();
}

main().catch(console.error);
