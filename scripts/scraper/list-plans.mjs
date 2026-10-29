import { getBrowserContext } from "./browser-context.mjs";

async function main() {
  console.log("=== Finding available budgets/plans in YNAB ===");
  const { context, page } = await getBrowserContext({ headless: false });

  await page.goto("https://app.ynab.com", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".nav-main, .sidebar", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click budget switcher at top-left of sidebar
  console.log("Looking for budget switcher...");
  const switcher = await page.$(".button-sidebar-budget, .sidebar-header, .nav-main button");
  if (switcher) {
    await switcher.click();
    await page.waitForTimeout(1000);

    const budgets = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".modal-popup a, .modal-container a, .budget-list a, .modal-sidebar-budget-list-item"));
      return items.map(el => ({
        text: el.innerText.trim(),
        href: el.getAttribute("href")
      }));
    });
    console.log("Found budget options in switcher:", budgets);
  }

  // Also check local storage or API state if available
  const currentUrl = page.url();
  console.log("Current URL:", currentUrl);

  await context.close();
}

main().catch(console.error);
