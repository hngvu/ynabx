import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const ACCOUNTS_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts`;

async function main() {
  console.log("Launching browser...");
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    console.log("Navigating to Accounts page...");
    await page.goto(ACCOUNTS_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const info = await page.evaluate(() => {
      // Look for buttons with View, Search, Filter or related icons
      const btns = Array.from(document.querySelectorAll("button, input, .button, a")).map(b => ({
        tag: b.tagName,
        className: b.className,
        id: b.id,
        text: b.textContent?.trim().slice(0, 40),
        ariaLabel: b.getAttribute("aria-label"),
        title: b.getAttribute("title"),
        placeholder: b.getAttribute("placeholder")
      }));
      return btns;
    });

    console.log("Buttons found:", info.filter(b => 
      /view|search|filter|option|setting/i.test(b.text || '') ||
      /view|search|filter|option|setting/i.test(b.ariaLabel || '') ||
      /view|search|filter|option|setting/i.test(b.placeholder || '') ||
      /view|search|filter|option|setting/i.test(b.className || '')
    ));

    // Also get all elements in .accounts-toolbar
    const toolbarInfo = await page.evaluate(() => {
      const tb = document.querySelector(".accounts-toolbar");
      return tb ? tb.innerHTML : "NO .accounts-toolbar FOUND";
    });
    fs.writeFileSync("scripts/scraper/accounts-toolbar-debug.html", toolbarInfo);
    console.log("Saved accounts-toolbar-debug.html");

  } finally {
    await context.close();
  }
}

main().catch(console.error);
