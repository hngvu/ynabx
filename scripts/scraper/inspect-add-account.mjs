import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  console.log("Navigating to Budget page...");
  await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Look for Add Account button on sidebar
  console.log("Looking for Add Account button...");
  const addAccountBtn = page.locator("button:has-text('Add Account'), .nav-add-account, button.button-sidebar-add-account").first();
  console.log("Found Add Account btn count:", await addAccountBtn.count());

  await addAccountBtn.click();
  await page.waitForTimeout(1000);

  // Inspect modal that popped up
  const modalInfo = await page.evaluate(() => {
    const modals = Array.from(document.querySelectorAll(".modal-overlay.active, .modal, [role='dialog']"));
    return modals.map(m => ({
      tag: m.tagName,
      className: m.className,
      id: m.id,
      text: m.innerText.slice(0, 300),
      buttons: Array.from(m.querySelectorAll("button")).map(b => b.innerText.trim())
    }));
  });
  console.log("Modal opened on Add Account click:", JSON.stringify(modalInfo, null, 2));

  await context.close();
}

main().catch(console.error);
