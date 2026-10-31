import { getBrowserContext } from "./browser-context.mjs";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const REFLECT_URL = `https://app.ynab.com/${TEST_PLAN_ID}/reflect/spending`;

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    console.log("Navigating to Reflect Spending page:", REFLECT_URL);
    await page.goto(REFLECT_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button, select, input, .reports-filter, .filter-button, .button, a")).map(b => ({
        tag: b.tagName,
        className: b.className,
        text: b.textContent?.trim().slice(0, 50),
        aria: b.getAttribute("aria-label"),
        role: b.getAttribute("role")
      }));
    });
    console.log("Interactive elements on Reflect Spending:\n", JSON.stringify(buttons, null, 2));

    // Also inspect the layout structure of spending breakdown
    const layout = await page.evaluate(() => {
      const mainContent = document.querySelector(".content, .reports-content, .scroll-container, .pure-g");
      return {
        url: window.location.href,
        classes: mainContent ? mainContent.className : "No main container",
        headings: Array.from(document.querySelectorAll("h1, h2, h3, .reports-header, .chart-header, .category-group-row, .category-row")).map(h => ({
          className: h.className,
          text: h.textContent?.trim().slice(0, 40)
        }))
      };
    });
    console.log("Layout details:\n", JSON.stringify(layout, null, 2));

  } finally {
    await context.close();
  }
}

main().catch(console.error);
