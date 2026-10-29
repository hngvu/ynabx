import { getBrowserContext, OUTPUT_DIR } from "./browser-context.mjs";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const cssPath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
  const cssText = fs.readFileSync(cssPath, "utf8");

  const tableHtmlPath = path.join(OUTPUT_DIR, "test_plan_modals", "budget_table_full.html");
  const tableHtml = fs.readFileSync(tableHtmlPath, "utf8");

  const testHtml = `<!DOCTYPE html>
<html lang="en" class="no-js mod_flexbox mod_flexwrap theme-default">
<head>
  <meta charset="UTF-8">
  <title>Exact Ancestor Test</title>
  <style>
    ${cssText}
  </style>
</head>
<body class="ember-application ynab-u">
  <div class="layout">
    <div class="content-layout user-logged-in">
      <div class="ynab-u content">
        <div class="content-min-break has-budget-views">
          <div class="budget-table-and-inspector">
            <section class="budget-table-container is-expanded">
              ${tableHtml}
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const outPath = path.join(OUTPUT_DIR, "test_plan_modals", "test_ancestor_fixed.html");
  fs.writeFileSync(outPath, testHtml, "utf8");

  const { context, page } = await getBrowserContext({ headless: false });
  await page.goto("file:///" + outPath.replace(/\\/g, "/"));
  await page.waitForTimeout(500);

  const tableComputed = await page.evaluate(() => {
    const row = document.querySelector(".budget-table-row:not(.is-master-category)");
    const cell = row ? row.querySelector(".budget-table-cell-name") : null;
    return {
      rowDisplay: row ? window.getComputedStyle(row).display : null,
      rowHeight: row ? window.getComputedStyle(row).height : null,
      cellDisplay: cell ? window.getComputedStyle(cell).display : null,
      cellWidth: cell ? window.getComputedStyle(cell).width : null
    };
  });
  console.log("Result with exact ancestors:", tableComputed);

  const shotPath = path.join(OUTPUT_DIR, "test_plan_modals", "test_ancestor_fixed.png");
  await page.screenshot({ path: shotPath });
  console.log("Screenshot saved:", shotPath);

  await context.close();
}

main().catch(console.error);
