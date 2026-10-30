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
    .preview-container {
      position: relative;
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
  console.log("Navigating to account page...");
  await page.goto(CHECKING_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".ynab-grid", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check 1 transaction checkbox
  console.log("Checking transaction...");
  const cb = page.locator(".ynab-grid-body .ynab-grid-cell-checkbox button").first();
  await cb.click();
  await page.waitForTimeout(1000);

  const actionBar = page.locator(".register-action-bar-container");
  const buttonTexts = await actionBar.locator("button").allInnerTexts();
  console.log("Action bar buttons:", buttonTexts);

  // Click the button that has 'More'
  const moreBtn = actionBar.locator("button").filter({ hasText: /More/i }).first();
  console.log("Clicking More button...");
  await moreBtn.click();
  await page.waitForTimeout(1000);

  // Find the More menu overlay
  const moreMenuLocator = page.locator(".modal-overlay.active, .modal-popup, .modal-register-action-bar-more, [class*='action-bar']").filter({
    hasText: /Duplicate|Delete|Move|Make Repeating|Match/i
  }).first();

  if (await moreMenuLocator.count() > 0) {
    const moreMenuHtml = await moreMenuLocator.evaluate(el => el.outerHTML);
    fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_more_menu.html"), moreMenuHtml, "utf8");
    fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_more_menu_preview.html"), wrapInPreview(moreMenuHtml, "Action Bar More Menu"), "utf8");
    await moreMenuLocator.screenshot({ path: path.join(OUTPUT_DIR, "action_bar_more_menu.png") });
    console.log("✓ Saved action_bar_more_menu.html & .png");

    // Also take screenshot of page showing both Action Bar and More menu
    await page.screenshot({ path: path.join(OUTPUT_DIR, "action_bar_with_more_menu.png") });
    console.log("✓ Saved action_bar_with_more_menu.png");
  } else {
    console.log("Fallback search for any active modal...");
    const activeModal = page.locator(".modal-overlay.active").first();
    if (await activeModal.count() > 0) {
      const activeModalHtml = await activeModal.evaluate(el => el.outerHTML);
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_more_menu.html"), activeModalHtml, "utf8");
      fs.writeFileSync(path.join(OUTPUT_DIR, "action_bar_more_menu_preview.html"), wrapInPreview(activeModalHtml, "Action Bar More Menu"), "utf8");
      await activeModal.screenshot({ path: path.join(OUTPUT_DIR, "action_bar_more_menu.png") });
      console.log("✓ Saved active modal as action_bar_more_menu");
    } else {
      console.log("Could not locate More menu. Let's dump all visible elements:");
      const visible = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("body *"))
          .filter(el => {
            const s = window.getComputedStyle(el);
            return (s.position === "absolute" || s.position === "fixed") && el.offsetWidth > 80 && el.offsetHeight > 50;
          })
          .map(el => ({ tag: el.tagName, class: el.className, text: el.innerText.slice(0, 150) }));
      });
      console.log(visible);
    }
  }

  await context.close();
}

main().catch(console.error);
