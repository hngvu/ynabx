import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const BUDGET_URL = `https://app.ynab.com/${TEST_PLAN_ID}/budget`;
const OUTPUT_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

function wrapInPreview(html, title, width = 320) {
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
      box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
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

    // 1. Sidebar Budget & User Settings Menu
    console.log("Scraping Sidebar Main Settings Menu...");
    const sidebarBudgetBtn = page.locator(".sidebar-nav-menu-budget").first();
    await sidebarBudgetBtn.click();
    await page.waitForTimeout(800);

    const settingsMenuLocator = page.locator(".ynab-new-settings-menu").first();
    const settingsMenuHtml = await settingsMenuLocator.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "popover_sidebar_settings_menu.html"), settingsMenuHtml);
    await settingsMenuLocator.screenshot({ path: path.join(OUTPUT_DIR, "popover_sidebar_settings_menu.png") });
    fs.writeFileSync(path.join(OUTPUT_DIR, "popover_sidebar_settings_menu_preview.html"), wrapInPreview(settingsMenuHtml, "Sidebar Settings & Budget Menu", 320));
    await page.screenshot({ path: path.join(OUTPUT_DIR, "sidebar_settings_menu_in_context.png") });

    // Hover or open "Open Plan" submenu
    console.log("Hovering Open Plan submenu...");
    const openPlanBtn = page.locator(".modal-select-budget-open").first();
    await openPlanBtn.hover();
    await page.waitForTimeout(500);
    const recentBudgetsLocator = page.locator(".settings-menu-recent-budgets").first();
    if (await recentBudgetsLocator.count() > 0) {
      const recentBudgetsHtml = await recentBudgetsLocator.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_sidebar_recent_budgets_menu.html"), recentBudgetsHtml);
      await recentBudgetsLocator.screenshot({ path: path.join(OUTPUT_DIR, "popover_sidebar_recent_budgets_menu.png") });
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_sidebar_recent_budgets_menu_preview.html"), wrapInPreview(recentBudgetsHtml, "Recent Plans Submenu", 280));
    }

    // Close settings menu
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // 2. Budget Views Filter Menu
    console.log("Scraping Budget Views Menu...");
    const viewsBtn = page.locator("button:has-text('Views'), .budget-toolbar-views, button[aria-describedby*='Views']").first();
    if (await viewsBtn.count() > 0) {
      await viewsBtn.click();
      await page.waitForTimeout(800);

      const viewsMenuLocator = page.locator(".modal-budget-views-menu, .menu").first();
      const viewsMenuHtml = await viewsMenuLocator.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_plan_views_menu.html"), viewsMenuHtml);
      await viewsMenuLocator.screenshot({ path: path.join(OUTPUT_DIR, "popover_plan_views_menu.png") });
      fs.writeFileSync(path.join(OUTPUT_DIR, "popover_plan_views_menu_preview.html"), wrapInPreview(viewsMenuHtml, "Budget Views Popover Menu", 240));
      await page.screenshot({ path: path.join(OUTPUT_DIR, "plan_views_menu_in_context.png") });
    }

    console.log("Menus scraping completed successfully!");
  } finally {
    await context.close();
  }
}

main().catch(console.error);
