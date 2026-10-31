import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/accounts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const searchInput = page.locator("input.transaction-search-input");
    await searchInput.pressSequentially("Groceries", { delay: 50 });
    await page.waitForTimeout(600);

    // Click the first recommendation
    const firstRec = page.locator(".transaction-search-recommendations button").first();
    await firstRec.click();
    await page.waitForTimeout(1000);

    const res = await page.evaluate(() => {
      const container = document.querySelector(".transaction-search");
      return {
        html: container ? container.outerHTML : "none",
        inputVal: document.querySelector(".transaction-search-input")?.value,
        innerTags: Array.from(container.querySelectorAll("*")).map(e => e.className)
      };
    });
    console.log("Result:", JSON.stringify(res, null, 2));

  } finally {
    await context.close();
  }
}

main().catch(console.error);
