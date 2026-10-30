import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const addAccountBtn = page.locator("button:has-text('Add Account')").first();
  await addAccountBtn.click();
  
  // Wait for loading to finish
  console.log("Waiting for modal options to appear...");
  await page.waitForSelector("button:has-text('Unlinked'), button:has-text('Add Unlinked'), .add-unlinked", { timeout: 15000 }).catch(e => console.log("Timeout waiting for unlinked text"));
  await page.waitForTimeout(2000);

  const content = await page.evaluate(() => {
    const m = document.querySelector(".modal-overlay.active");
    return {
      text: m?.innerText,
      buttons: Array.from(m?.querySelectorAll("button, a") || []).map(b => ({
        tag: b.tagName,
        text: b.innerText.trim(),
        className: b.className
      }))
    };
  });
  console.log("Modal state after wait:", JSON.stringify(content, null, 2));

  await context.close();
}

main().catch(console.error);
