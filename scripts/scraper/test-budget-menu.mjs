import { getBrowserContext } from "./browser-context.mjs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const budgetMenuBtn = page.locator(".sidebar-nav-menu-budget").first();
    console.log("Clicking budget switcher / settings menu in sidebar...");
    await budgetMenuBtn.click();
    await page.waitForTimeout(800);

    const menu = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll(".modal-overlay, .modal-popup, .popover, .dropdown-menu, .modal, .menu-list, .sidebar-menu")).map(e => ({
        tag: e.tagName,
        className: e.className,
        text: e.textContent?.trim().slice(0, 100)
      }));
      return modals;
    });
    console.log("Budget switcher popover/menu opened:", menu);
    await page.screenshot({ path: "scripts/scraper/output/test_plan_modals/sidebar_budget_menu_open.png" });

  } finally {
    await context.close();
  }
}

main().catch(console.error);
