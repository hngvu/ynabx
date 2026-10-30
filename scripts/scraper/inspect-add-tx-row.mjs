import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const CHECKING_ID = "ddd417e8-d4c9-4981-ad15-4c61c5d7ccc4";
const CHECKING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/${CHECKING_ID}`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ynab-grid", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Add Transaction
  const addTxBtn = page.locator("button:has-text('Add Transaction')").first();
  await addTxBtn.click();
  await page.waitForTimeout(1000);

  // Inspect the cells inside the editing row
  const rowCells = await page.evaluate(() => {
    const editRow = document.querySelector(".ynab-grid-add-rows, .is-editing");
    if (!editRow) return "no edit row";
    return Array.from(editRow.querySelectorAll(".ynab-grid-cell")).map(cell => ({
      className: cell.className,
      text: cell.innerText.trim(),
      inputs: Array.from(cell.querySelectorAll("input, button, select")).map(i => ({
        tag: i.tagName,
        type: i.type,
        className: i.className,
        placeholder: i.placeholder,
        value: i.value
      }))
    }));
  });
  console.log("Add Transaction row cells:", JSON.stringify(rowCells, null, 2));

  // Now click on Date cell
  console.log("\nClicking date cell/input...");
  const dateInput = page.locator(".ynab-grid-add-rows .ynab-grid-cell-date input, .is-editing .ynab-grid-cell-date input").first();
  await dateInput.click();
  await page.waitForTimeout(1000);

  // Check what new elements appeared in document
  const openPopups = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("body > div, .modal-overlay, .modal-popup, .ember-view"))
      .filter(el => {
        const s = window.getComputedStyle(el);
        return (s.position === "absolute" || s.position === "fixed") && el.offsetWidth > 50 && el.offsetHeight > 50;
      })
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        text: el.innerText.slice(0, 150)
      }));
  });
  console.log("Open popups after date click:", openPopups);

  // Now click on Payee input
  console.log("\nClicking payee input...");
  const payeeInput = page.locator(".ynab-grid-add-rows .ynab-grid-cell-payeeName input, .is-editing .ynab-grid-cell-payeeName input").first();
  await payeeInput.click();
  await page.waitForTimeout(1000);
  const payeePopups = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("body > div, .modal-overlay, .modal-popup, .ember-view, [class*='autocomplete']"))
      .filter(el => {
        const s = window.getComputedStyle(el);
        return (s.position === "absolute" || s.position === "fixed") && el.offsetWidth > 50 && el.offsetHeight > 50;
      })
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText.slice(0, 200)
      }));
  });
  console.log("Open popups after payee click:", payeePopups);

  // Now click on Category input
  console.log("\nClicking category input...");
  const catInput = page.locator(".ynab-grid-add-rows .ynab-grid-cell-subCategoryNameAuto input, .is-editing .ynab-grid-cell-subCategoryNameAuto input, .is-editing [class*='category'] input").first();
  await catInput.click();
  await page.waitForTimeout(1000);
  const catPopups = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("body > div, .modal-overlay, .modal-popup, .ember-view, [class*='autocomplete']"))
      .filter(el => {
        const s = window.getComputedStyle(el);
        return (s.position === "absolute" || s.position === "fixed") && el.offsetWidth > 50 && el.offsetHeight > 50;
      })
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText.slice(0, 200)
      }));
  });
  console.log("Open popups after category click:", catPopups);

  await context.close();
}

main().catch(console.error);
