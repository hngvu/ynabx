import { getBrowserContext } from "./browser-context.mjs";
import fs from "fs";
import path from "path";

const TEST_PLAN_ID = "9a070eef-a9b4-4903-b863-d703e7768ed4";
const CHECKING_ID = "ddd417e8-d4c9-4981-ad15-4c61c5d7ccc4";
const CHECKING_URL = `https://app.ynab.com/${TEST_PLAN_ID}/accounts/${CHECKING_ID}`;
const OUTPUT_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

function wrapInPreview(html, title) {
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
      padding: 40px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body class="ember-application">
  <div class="preview-container">
    ${html}
  </div>
</body>
</html>`;
}

async function main() {
  const { context, page } = await getBrowserContext({ headless: true });
  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ynab-grid", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check 1 transaction
  const cb = page.locator(".ynab-grid-body .ynab-grid-cell-checkbox button").first();
  await cb.click();
  await page.waitForTimeout(1000);

  const actionBar = page.locator(".register-action-bar-container");

  // Test Categorize button
  const catBtn = actionBar.locator("button").filter({ hasText: /Categorize/i }).first();
  if (await catBtn.count() > 0) {
    console.log("Clicking Categorize button in action bar...");
    await catBtn.click();
    await page.waitForTimeout(800);
    const catOverlay = page.locator(".modal-overlay.active").first();
    if (await catOverlay.count() > 0) {
      const html = await catOverlay.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_categorize_menu.html"), html, "utf8");
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_categorize_menu_preview.html"), wrapInPreview(html, "Action Bar Categorize Menu"), "utf8");
      await catOverlay.screenshot({ path: path.join(OUTPUT_DIR, "action_bar_categorize_menu.png") });
      console.log("✓ Saved action_bar_categorize_menu");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // Test Flag button
  const flagBtn = actionBar.locator("button").filter({ hasText: /Flag/i }).first();
  if (await flagBtn.count() > 0) {
    console.log("Clicking Flag button in action bar...");
    await flagBtn.click();
    await page.waitForTimeout(800);
    const flagOverlay = page.locator(".modal-overlay.active").first();
    if (await flagOverlay.count() > 0) {
      const html = await flagOverlay.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_flag_menu.html"), html, "utf8");
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_flag_menu_preview.html"), wrapInPreview(html, "Action Bar Flag Menu"), "utf8");
      await flagOverlay.screenshot({ path: path.join(OUTPUT_DIR, "action_bar_flag_menu.png") });
      console.log("✓ Saved action_bar_flag_menu");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  await context.close();
}

main().catch(console.error);
