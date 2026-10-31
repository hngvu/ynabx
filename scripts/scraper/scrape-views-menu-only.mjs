import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;
const OUTPUT_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

function wrapInPreview(html, title, width = 240) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} - YNAB Component</title>
  <style>
${MASTER_CSS}
  </style>
  <style>
    body {
      background-color: #f4f5f7;
      margin: 0;
      padding: 40px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .preview-card {
      width: ${width}px;
      position: relative;
    }
    .menu.js-menu {
      position: static !important;
      display: block !important;
      height: auto !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
    }
  </style>
</head>
<body class="ember-application">
  <div class="preview-card">
    ${html}
  </div>
</body>
</html>`;
}

async function main() {
  const { context, page } = await getBrowserContext({ headless: false });
  try {
    await page.goto(BUDGET_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Click Views button
    const viewsBtn = page.locator(".budget-toolbar button:has-text('Views'), [aria-label*='Views'], button[aria-describedby*='Views']").first();
    await viewsBtn.click();
    await page.waitForTimeout(800);

    const viewsMenu = page.locator(".modal-budget-views-menu").first();
    if (await viewsMenu.count() > 0) {
      const html = await viewsMenu.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_plan_views_menu.html"), html);
      await viewsMenu.screenshot({ path: path.join(OUTPUT_DIR, "popover_plan_views_menu.png") });
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_plan_views_menu_preview.html"), wrapInPreview(html, "Budget Views Menu Popover", 240));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "plan_views_menu_in_context.png") });
      console.log("Successfully captured Views menu!");
    } else {
      console.log("modal-budget-views-menu not found");
    }
  } finally {
    await context.close();
  }
}

main().catch(console.error);
