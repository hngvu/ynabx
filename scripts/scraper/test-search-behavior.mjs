import { getBrowserContext } from "./browser-context.mjs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/accounts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const searchInput = page.locator("input.transaction-search-input");
    await searchInput.click();
    await page.waitForTimeout(500);

    // Let's see what DOM changes happen on focus or typing
    const focusState = await page.evaluate(() => {
      const container = document.querySelector(".transaction-search");
      return {
        classes: container.className,
        html: container.outerHTML
      };
    });
    console.log("Focus state classes:", focusState.classes);

    // Type a search term
    await searchInput.fill("Rent");
    await page.waitForTimeout(800);

    const typedState = await page.evaluate(() => {
      const container = document.querySelector(".transaction-search");
      // Check if any popup / menu appeared anywhere in body
      const popups = Array.from(document.querySelectorAll("body > div:not(.ember-application), .modal-overlay, .dropdown-menu, .popover, [role='listbox'], [role='menu'], .transaction-search-menu")).map(e => e.outerHTML);
      return {
        classes: container.className,
        html: container.outerHTML,
        popupsCount: popups.length,
        popups
      };
    });
    console.log("Typed state classes:", typedState.classes);
    console.log("Popups count:", typedState.popupsCount);
    console.log("Typed container html:", typedState.html);

    // Also check what happens in register when filtered
    const registerState = await page.evaluate(() => {
      const rows = document.querySelectorAll(".ynab-grid-body-row");
      return {
        rowCount: rows.length,
        firstRowText: rows[0]?.textContent?.trim().slice(0, 80)
      };
    });
    console.log("Register rows:", registerState);

  } finally {
    await context.close();
  }
}

main().catch(console.error);
