import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BASE_BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BASE_BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".budget-table", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Test clicking Month header button
  console.log("Testing month button click...");
  const monthBtn = await page.$(".budget-header-calendar-date-button, .button-calendar-date, .budget-header-date button, button.budget-header-calendar-date");
  if (monthBtn) {
    console.log("Month button found, clicking...");
    await monthBtn.click();
    await page.waitForTimeout(1000);
    const popups = await page.evaluate(() => {
      // Find all elements with high z-index or fixed/absolute position
      return Array.from(document.querySelectorAll("body > div, .ember-view"))
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.position === "absolute" || style.position === "fixed" || style.zIndex > 10;
        })
        .map(el => ({ tag: el.tagName, className: el.className, id: el.id, text: el.innerText.slice(0, 100) }));
    });
    console.log("Popups after month click:", popups.filter(p => p.className || p.text));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  } else {
    console.log("Month button not found!");
  }

  // 2. Test clicking a Category Row to see inspector target card
  console.log("Clicking Groceries row...");
  const groceriesRow = await page.locator(".budget-table-row").filter({ hasText: "Groceries" }).first();
  if (await groceriesRow.count()) {
    await groceriesRow.click();
    await page.waitForTimeout(1000);
    const inspectorHtml = await page.evaluate(() => {
      const ins = document.querySelector(".budget-inspector");
      return ins ? ins.innerHTML.slice(0, 500) : "no inspector";
    });
    console.log("Inspector sample HTML:", inspectorHtml);
  }

  // 3. Test clicking Available pill for Groceries (has positive balance: $4,143.19)
  console.log("Clicking Groceries Available balance...");
  const grocAvail = groceriesRow.locator(".budget-table-cell-available button, .budget-table-cell-available span.currency, .budget-table-cell-available").first();
  if (await grocAvail.count()) {
    await grocAvail.click({ force: true });
    await page.waitForTimeout(1000);
    const moveMoneyPopup = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".modal, .modal-popup, .modal-container, .ember-view, [class*='move-money'], [class*='dropdown']"))
        .filter(el => el.innerText && el.innerText.includes("Move"))
        .map(el => ({ className: el.className, text: el.innerText.slice(0, 150) }));
    });
    console.log("Move money popups found:", moveMoneyPopup);
    await page.keyboard.press("Escape");
  }

  await context.close();
}

main().catch(console.error);
