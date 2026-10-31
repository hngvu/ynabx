import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const btn = page.locator(".sidebar-nav-menu-budget").first();
    await btn.click({ force: true });
    await page.waitForTimeout(800);

    const menuData = await page.evaluate(() => {
      const menus = Array.from(document.querySelectorAll(".menu.js-menu")).map(m => ({
        className: m.className,
        outerHTML: m.outerHTML
      }));
      return menus;
    });

    console.log("Found menus:", menuData.length);
    fs.writeFileSync("scripts/scraper/output/test_plan_modals/popover_sidebar_settings_menu.html", menuData[0]?.outerHTML || "");
    fs.writeFileSync("scripts/scraper/output/test_plan_modals/popover_sidebar_recent_budgets_menu.html", menuData[1]?.outerHTML || "");
    console.log("Saved menu htmls.");

  } finally {
    await context.close();
  }
}

main().catch(console.error);
