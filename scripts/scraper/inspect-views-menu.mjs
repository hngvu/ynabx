import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto("https://app.ynab.com/9a070eef-a9b4-4903-b863-d703e7768ed4/budget", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const viewsBtn = page.locator("button:has-text('Views'), .budget-toolbar-views, button[aria-describedby*='Views'], .ynab-toolbar-views, [aria-label*='Views']");
    const count = await viewsBtn.count();
    console.log("Views button count:", count);
    if (count > 0) {
      await viewsBtn.first().click();
      await page.waitForTimeout(600);
      const html = await page.evaluate(() => {
        const m = document.querySelector(".menu, .modal-overlay, .dropdown-menu, .popover");
        return m ? m.outerHTML : "none";
      });
      console.log("Views menu html found:", html !== "none");
      fs.writeFileSync("scripts/scraper/output/test_plan_modals/popover_plan_views_menu.html", html);
    }
  } finally {
    await context.close();
  }
}

main().catch(console.error);
