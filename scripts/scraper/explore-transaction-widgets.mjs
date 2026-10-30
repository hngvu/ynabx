import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const CHECKING_ID = "ddd417e8-d4c9-4981-ad15-4c61c5d7ccc4";
const CHECKING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/${CHECKING_ID}`;

async function main() {
  console.log("=== Exploring Transaction Date Picker, Comboboxes & Action Bar ===");
  const { context, page } = await getBrowserContext({ headless: false });

  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ynab-grid", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Check Action Bar by selecting a transaction checkbox
  console.log("1. Checking transaction checkbox for Action Bar...");
  const firstTxCheckbox = page.locator(".ynab-grid-body .ynab-grid-cell-checkbox input, .ynab-grid-body .ynab-grid-cell-checkbox button").first();
  if (await firstTxCheckbox.count()) {
    console.log("Found transaction checkbox, clicking...");
    await firstTxCheckbox.click({ force: true });
    await page.waitForTimeout(1000);

    const actionBarInfo = await page.evaluate(() => {
      // Look for action bar or toolbar updates or floating bar
      const bar = document.querySelector(".register-bottom-bar, .ynab-grid-actions, .accounts-toolbar-edit-transaction, [class*='action-bar'], [class*='actions-menu'], [class*='selected-actions']");
      const allActive = Array.from(document.querySelectorAll("button, div"))
        .filter(el => (el.innerText || "").toLowerCase().includes("selected"))
        .map(el => ({ tag: el.tagName, className: el.className, text: el.innerText.trim().slice(0, 100) }));
      return {
        bar: bar ? { className: bar.className, html: bar.outerHTML.slice(0, 500) } : "none",
        allActive
      };
    });
    console.log("Action Bar Info:", JSON.stringify(actionBarInfo, null, 2));

    // Also check the "Edit" button in the toolbar when rows are selected
    const editBtn = page.locator("button:has-text('Edit'), .button-edit, .accounts-toolbar-edit-transaction button").first();
    if (await editBtn.count()) {
      console.log("Clicking Edit button in toolbar...");
      await editBtn.click();
      await page.waitForTimeout(800);
      const editMenu = await page.evaluate(() => {
        const m = document.querySelector(".modal-overlay.active, .modal-popup, .modal, .dropdown-content, [class*='menu']");
        return m ? { className: m.className, text: m.innerText.slice(0, 300) } : "none";
      });
      console.log("Edit dropdown menu:", editMenu);
      await page.keyboard.press("Escape");
    }

    // Deselect
    await firstTxCheckbox.click({ force: true });
    await page.waitForTimeout(500);
  }

  // 2. Click 'Add Transaction' button
  console.log("2. Clicking 'Add Transaction' button...");
  const addTxBtn = page.locator("button:has-text('Add Transaction'), button.button-add-transaction").first();
  if (await addTxBtn.count()) {
    await addTxBtn.click();
    await page.waitForTimeout(1000);

    // A) Date field click -> Date Picker
    console.log("2A. Clicking Date field in add row...");
    const dateField = page.locator(".ynab-grid-add-rows .ynab-grid-cell-date, .is-editing .ynab-grid-cell-date input, .is-editing .ynab-grid-cell-date").first();
    if (await dateField.count()) {
      await dateField.click();
      await page.waitForTimeout(800);
      const datePickerInfo = await page.evaluate(() => {
        const p = document.querySelector(".modal-overlay.active, .modal-popup, .modal-calendar, [class*='calendar'], [class*='datepicker']");
        return p ? { className: p.className, html: p.outerHTML.slice(0, 400), text: p.innerText.slice(0, 150) } : "none";
      });
      console.log("Date Picker Popover Info:", datePickerInfo);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // B) Payee field click -> Payee Combobox
    console.log("2B. Clicking Payee field in add row...");
    const payeeField = page.locator(".ynab-grid-add-rows .ynab-grid-cell-payeeName input, .is-editing .ynab-grid-cell-payeeName input, .is-editing .ynab-grid-cell-payeeName").first();
    if (await payeeField.count()) {
      await payeeField.click();
      await page.waitForTimeout(800);
      const payeeCombobox = await page.evaluate(() => {
        const c = document.querySelector(".modal-overlay.active, .modal-popup, .autocomplete-content, [class*='payee-autocomplete'], [class*='dropdown'], [class*='combobox']");
        return c ? { className: c.className, html: c.outerHTML.slice(0, 400), text: c.innerText.slice(0, 200) } : "none";
      });
      console.log("Payee Combobox Info:", payeeCombobox);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // C) Category field click -> Category Combobox
    console.log("2C. Clicking Category field in add row...");
    const catField = page.locator(".ynab-grid-add-rows .ynab-grid-cell-subCategoryNameAuto input, .is-editing .ynab-grid-cell-subCategoryNameAuto input, .is-editing [class*='category'] input, .is-editing [class*='subCategory']").first();
    if (await catField.count()) {
      await catField.click();
      await page.waitForTimeout(800);
      const catCombobox = await page.evaluate(() => {
        const c = document.querySelector(".modal-overlay.active, .modal-popup, .autocomplete-content, [class*='category-autocomplete'], [class*='dropdown']");
        return c ? { className: c.className, html: c.outerHTML.slice(0, 400), text: c.innerText.slice(0, 200) } : "none";
      });
      console.log("Category Combobox Info:", catCombobox);
      await page.keyboard.press("Escape");
    }

    await page.keyboard.press("Escape");
  }

  await context.close();
}

main().catch(console.error);
