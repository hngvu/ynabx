import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Click Add Account
  const addAccountBtn = page.locator("button:has-text('Add Account')").first();
  await addAccountBtn.click();
  
  // Wait for "Add an Unlinked Account" button
  console.log("Waiting for 'Add an Unlinked Account' button...");
  const unlinkedBtn = page.locator("button:has-text('Add an Unlinked Account')").first();
  await unlinkedBtn.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(500);

  console.log("Clicking 'Add an Unlinked Account'...");
  await unlinkedBtn.click();
  await page.waitForTimeout(1500);

  // Inspect the unlinked account form
  const unlinkedState = await page.evaluate(() => {
    const modal = document.querySelector(".modal-overlay.active");
    if (!modal) return "No active modal found";
    return {
      text: modal.innerText,
      inputs: Array.from(modal.querySelectorAll("input, select, button")).map(el => ({
        tag: el.tagName,
        type: el.type,
        className: el.className,
        placeholder: el.placeholder,
        text: el.innerText.trim(),
        value: el.value
      }))
    };
  });
  console.log("Unlinked Form state:", JSON.stringify(unlinkedState, null, 2));

  // Find Account Type select/button/dropdown
  console.log("\nSearching for Account Type trigger...");
  const typeTrigger = page.locator(".modal-overlay.active select, .modal-overlay.active button:has-text('Checking'), .modal-overlay.active button:has-text('Select'), .modal-overlay.active [class*='account-type'], .modal-overlay.active [class*='select']").first();
  console.log("typeTrigger count:", await typeTrigger.count());

  if (await typeTrigger.count() > 0) {
    console.log("Clicking Account Type trigger...");
    await typeTrigger.click();
    await page.waitForTimeout(1000);

    const popups = await page.evaluate(() => {
      const active = Array.from(document.querySelectorAll(".modal-overlay, .modal-popup, .ember-view, [role='listbox'], select option, ul[role='menu']"))
        .filter(el => {
          const s = window.getComputedStyle(el);
          return (s.position === "absolute" || s.position === "fixed" || el.tagName === "OPTION") && el.offsetWidth > 0;
        });
      return active.map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText.slice(0, 300)
      }));
    });
    console.log("Account type options/popups:", JSON.stringify(popups, null, 2));
  }

  await context.close();
}

main().catch(console.error);
