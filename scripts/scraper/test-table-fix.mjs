import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

async function testBudgetTable() {
  const cssPath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
  const cssText = fs.readFileSync(cssPath, "utf8");

  const tableHtmlPath = path.join(OUTPUT_DIR, "test_plan_modals", "budget_table_full.html");
  const tableHtml = fs.readFileSync(tableHtmlPath, "utf8");

  const fixedHtml = `<!DOCTYPE html>
<html lang="en" class="no-js mod_flexbox mod_flexwrap theme-default">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Budget Table Full Preview</title>
  <style>
    ${cssText}
    
    body {
      margin: 0;
      padding: 20px;
      background: #f4f5f7;
    }
  </style>
</head>
<body class="ember-application ynab-u">
  <div class="layout">
    <div class="content-layout user-logged-in">
      <div class="budget-content" style="max-width: 1100px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); padding: 16px;">
        ${tableHtml}
      </div>
    </div>
  </div>
</body>
</html>`;

  const outPath = path.join(OUTPUT_DIR, "test_plan_modals", "test_table_fixed.html");
  fs.writeFileSync(outPath, fixedHtml, "utf8");

  const { context, page } = await getBrowserContext({ headless: false });
  const fileUrl = "file:///" + outPath.replace(/\\/g, "/");
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const shotPath = path.join(OUTPUT_DIR, "test_plan_modals", "test_table_fixed.png");
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log("Screenshot saved:", shotPath);

  const tableComputed = await page.evaluate(() => {
    const row = document.querySelector(".budget-table-row:not(.is-master-category)");
    const avail = document.querySelector(".budget-table-cell-available .currency");
    return {
      rowHeight: row ? window.getComputedStyle(row).height : null,
      availColor: avail ? window.getComputedStyle(avail).color : null,
      availBg: avail ? window.getComputedStyle(avail).backgroundColor : null,
      availRadius: avail ? window.getComputedStyle(avail).borderRadius : null
    };
  });
  console.log("Table computed:", tableComputed);

  await context.close();
}

testBudgetTable().catch(console.error);
