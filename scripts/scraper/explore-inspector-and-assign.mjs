import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  console.log("=== Exploring Category Popovers, Assign buttons, and Inspector ===");
  const { context, page } = await getBrowserContext({ headless: false });

  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".budget-table", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Check Assigned input click (calculator / quick assign popover)
  console.log("1. Checking Assigned input in Groceries row...");
  const grocRow = page.locator(".budget-table-row").filter({ hasText: "Groceries" }).first();
  const assignedInput = grocRow.locator(".budget-table-cell-budgeted input, .budget-table-cell-budgeted").first();
  if (await assignedInput.count()) {
    console.log("Found assigned cell, clicking/focusing...");
    await assignedInput.click();
    await page.waitForTimeout(800);
    const popupsAfterAssign = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll(".modal-overlay, .modal-popup, .ember-view, [class*='calculator'], [class*='dropdown']"));
      return els.filter(el => {
        const s = window.getComputedStyle(el);
        return (s.position === "absolute" || s.position === "fixed") && el.innerText.length > 0;
      }).map(el => ({ className: el.className, text: el.innerText.slice(0, 100) }));
    });
    console.log("Popups after assigned click:", popupsAfterAssign);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // 2. Check Activity click (opens Activity modal!)
  console.log("2. Checking Activity link in Groceries row (-$204.65)...");
  const activityBtn = grocRow.locator(".budget-table-cell-activity button, .budget-table-cell-activity a, .budget-table-cell-activity .currency").first();
  if (await activityBtn.count()) {
    console.log("Found activity button, clicking...");
    await activityBtn.click();
    await page.waitForTimeout(1000);
    const activityModal = await page.evaluate(() => {
      const m = document.querySelector(".modal-overlay.active, .modal-popup, .modal-container");
      return m ? { className: m.className, text: m.innerText.slice(0, 300) } : "no modal";
    });
    console.log("Activity Modal:", activityModal);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // 3. Inspect Groceries details in Inspector
  console.log("3. Inspecting Groceries row...");
  await grocRow.click();
  await page.waitForTimeout(800);

  const inspectorDetails = await page.evaluate(() => {
    const ins = document.querySelector(".budget-inspector");
    if (!ins) return "no inspector";
    const buttons = Array.from(ins.querySelectorAll("button")).map(b => b.innerText.trim()).filter(Boolean);
    const sections = Array.from(ins.querySelectorAll(".budget-inspector-section, .inspector-section, [class*='card'], [class*='breakdown']"))
      .map(s => ({ className: s.className, title: (s.querySelector("h2, h3, h4, .title") || {}).innerText }));
    return { buttons, sections };
  });
  console.log("Inspector details:", JSON.stringify(inspectorDetails, null, 2));

  // 4. Check 'Edit Target' in Inspector
  console.log("4. Checking Edit Target button...");
  const editTargetBtn = await page.$(".budget-inspector button:has-text('Edit Target'), .budget-inspector button:has-text('Create Target'), .inspector-target button");
  if (editTargetBtn) {
    console.log("Found Edit Target button, clicking...");
    await editTargetBtn.click();
    await page.waitForTimeout(1000);
    const targetModal = await page.evaluate(() => {
      const m = document.querySelector(".modal-overlay.active, .modal-popup, .modal-container, .target-editor");
      return m ? { className: m.className, text: m.innerText.slice(0, 300) } : "no modal";
    });
    console.log("Target Modal:", targetModal);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  // 5. Check 'Recent Moves' modal in month summary inspector
  console.log("5. Checking Recent Moves modal...");
  await page.keyboard.press("Escape"); // deselect
  await page.waitForTimeout(600);
  const recentMovesBtn = await page.$("button:has-text('Recent Moves'), .recent-moves-open-modal-container button");
  if (recentMovesBtn) {
    console.log("Found Recent Moves button, clicking...");
    await recentMovesBtn.click();
    await page.waitForTimeout(1000);
    const recentMovesModal = await page.evaluate(() => {
      const m = document.querySelector(".modal-overlay.active, .modal-popup, .modal-container");
      return m ? { className: m.className, text: m.innerText.slice(0, 300) } : "no modal";
    });
    console.log("Recent Moves Modal:", recentMovesModal);
    await page.keyboard.press("Escape");
  }

  await context.close();
}

main().catch(console.error);
