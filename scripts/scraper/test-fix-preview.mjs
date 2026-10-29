import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

async function testFix() {
  const cssPath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
  const cssText = fs.readFileSync(cssPath, "utf8");

  const modalHtmlPath = path.join(OUTPUT_DIR, "test_plan_modals", "popover_move_money.html");
  const modalHtml = fs.readFileSync(modalHtmlPath, "utf8");

  const fixedHtml = `<!DOCTYPE html>
<html lang="en" class="no-js mod_flexbox mod_flexwrap">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Move Money Preview</title>
  <style>
    /* Inlined YNAB Bundled CSS */
    ${cssText}

    /* Helper for standalone preview display */
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      background: #f4f5f7;
    }
  </style>
</head>
<body class="ember-application ynab-u">
  ${modalHtml}
</body>
</html>`;

  const outPath = path.join(OUTPUT_DIR, "test_plan_modals", "test_move_money_fixed.html");
  fs.writeFileSync(outPath, fixedHtml, "utf8");

  const { context, page } = await getBrowserContext({ headless: false });
  const fileUrl = "file:///" + outPath.replace(/\\/g, "/");
  console.log("Navigating to fixed HTML:", fileUrl);
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const shotPath = path.join(OUTPUT_DIR, "test_plan_modals", "test_move_money_fixed.png");
  await page.screenshot({ path: shotPath });
  console.log("Screenshot saved:", shotPath);

  const modalComputed = await page.evaluate(() => {
    const el = document.querySelector(".modal-overlay");
    if (!el) return "none";
    const s = window.getComputedStyle(el);
    const m = document.querySelector(".modal");
    const ms = m ? window.getComputedStyle(m) : null;
    return {
      overlayPos: s.position,
      overlayBg: s.backgroundColor,
      modalBg: ms ? ms.backgroundColor : null,
      modalBoxShadow: ms ? ms.boxShadow : null,
      modalBorderRadius: ms ? ms.borderRadius : null
    };
  });
  console.log("Modal computed properties:", modalComputed);

  await context.close();
}

testFix().catch(console.error);
