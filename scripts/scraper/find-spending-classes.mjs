import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(`https://app.ynab.com/${TEST_PLAN_ID}/reflect/spending-breakdown`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const elements = await page.evaluate(() => {
      // Find all elements containing 'Farmers Market' or 'Categories'
      const toggle = document.querySelector(".spending-breakdown__category-group-toggle");
      const parent = toggle ? toggle.closest(".content, section, main, [class*='spending']") : null;
      return {
        toggleParent: parent ? parent.className : "no parent found",
        bodyChildren: Array.from(document.querySelectorAll(".ember-application > div, .layout > div, .content-container > div")).map(e => ({
          tag: e.tagName,
          className: e.className
        })),
        allSpendingClasses: Array.from(document.querySelectorAll("[class*='spending-breakdown']")).map(e => ({
          tag: e.tagName,
          className: e.className
        }))
      };
    });

    console.log("Found Spending Breakdown elements:\n", JSON.stringify(elements, null, 2));

  } finally {
    await context.close();
  }
}

main().catch(console.error);
