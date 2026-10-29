import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, "output");

const cssBundlePath = path.join(OUTPUT_DIR, "css", "all-ynab.css");
const allCss = fs.readFileSync(cssBundlePath, "utf8");

/**
 * Creates a fully styled standalone HTML file that renders 100% identical to YNAB
 */
function buildCompletePage(contentHtml, title, type = "budget") {
  let wrappedContent = contentHtml;

  if (type === "modal") {
    // Modals in YNAB live directly under body with overlay
    wrappedContent = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative;">
        ${contentHtml}
      </div>
    `;
  } else if (type === "budget_table") {
    // Budget table requires the exact container hierarchy for flexbox rules
    wrappedContent = `
      <div class="layout">
        <div class="content-layout user-logged-in">
          <div class="ynab-u content">
            <div class="content-min-break has-budget-views">
              <div class="budget-table-and-inspector js-budget-table-and-inspector" style="max-width: 1200px; margin: 24px auto;">
                <section class="budget-table-container is-expanded">
                  ${contentHtml}
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (type === "inspector") {
    // Inspector requires budget-table-and-inspector container
    wrappedContent = `
      <div class="layout">
        <div class="content-layout user-logged-in">
          <div class="ynab-u content">
            <div class="budget-table-and-inspector" style="max-width: 450px; margin: 24px auto; background: #fff; border: 1px solid #d9dcde; border-radius: 8px;">
              ${contentHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (type === "grid") {
    // Accounts grid ledger
    wrappedContent = `
      <div class="layout">
        <div class="content-layout user-logged-in">
          <div class="ynab-u content">
            <div class="register-content" style="max-width: 1400px; margin: 24px auto; background: #fff; border: 1px solid #d9dcde; border-radius: 8px; overflow: hidden;">
              ${contentHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Default general component wrapper
    wrappedContent = `
      <div class="layout">
        <div class="content-layout user-logged-in">
          <div class="ynab-u content" style="max-width: 1200px; margin: 24px auto; padding: 20px;">
            ${contentHtml}
          </div>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en" class="no-js mod_flexbox mod_flexwrap theme-default">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - YNAB Exact Spec</title>
  <style>
    /* Inlined YNAB Complete CSS */
    ${allCss}

    /* Standalone Preview Fixes */
    html, body {
      min-height: 100%;
      margin: 0;
      padding: 0;
      background-color: #f4f5f7;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body class="ember-application ynab-u">
  ${wrappedContent}
</body>
</html>`;
}

async function main() {
  console.log("=== Rebuilding all preview HTML files with exact CSS & DOM hierarchy ===");

  const modalsDir = path.join(OUTPUT_DIR, "test_plan_modals");
  const modalFiles = fs.readdirSync(modalsDir).filter(f => f.endsWith(".html") && !f.endsWith("_preview.html"));

  for (const f of modalFiles) {
    const filePath = path.join(modalsDir, f);
    const content = fs.readFileSync(filePath, "utf8");
    const title = f.replace(".html", "").replace(/_/g, " ").toUpperCase();

    let type = "general";
    if (f.startsWith("modal_") || f.startsWith("popover_")) {
      type = "modal";
    } else if (f.includes("table") || f.includes("row_")) {
      type = "budget_table";
    } else if (f.includes("inspector")) {
      type = "inspector";
    } else if (f.includes("grid") || f.includes("account")) {
      type = "grid";
    }

    const previewHtml = buildCompletePage(content, title, type);
    const previewPath = path.join(modalsDir, f.replace(".html", "_preview.html"));
    fs.writeFileSync(previewPath, previewHtml, "utf8");
    console.log(`  ✔ Rebuilt: ${path.basename(previewPath)} (type: ${type})`);
  }

  // Also rebuild output/budget/ previews
  const budgetDir = path.join(OUTPUT_DIR, "budget");
  if (fs.existsSync(budgetDir)) {
    const bFiles = fs.readdirSync(budgetDir).filter(f => f.endsWith(".html") && !f.endsWith("_preview.html") && f !== "full_page.html");
    for (const f of bFiles) {
      const filePath = path.join(budgetDir, f);
      const content = fs.readFileSync(filePath, "utf8");
      const title = f.replace(".html", "").replace(/_/g, " ").toUpperCase();
      let type = f.includes("table") || f.includes("row") ? "budget_table" : f.includes("inspector") ? "inspector" : "general";
      const previewHtml = buildCompletePage(content, title, type);
      fs.writeFileSync(path.join(budgetDir, f.replace(".html", "_preview.html")), previewHtml, "utf8");
      console.log(`  ✔ Rebuilt budget: ${f}`);
    }
  }

  // Also rebuild output/accounts/ previews
  const accountsDir = path.join(OUTPUT_DIR, "accounts");
  if (fs.existsSync(accountsDir)) {
    const aFiles = fs.readdirSync(accountsDir).filter(f => f.endsWith(".html") && !f.endsWith("_preview.html") && f !== "full_page.html");
    for (const f of aFiles) {
      const filePath = path.join(accountsDir, f);
      const content = fs.readFileSync(filePath, "utf8");
      const title = f.replace(".html", "").replace(/_/g, " ").toUpperCase();
      const previewHtml = buildCompletePage(content, title, "grid");
      fs.writeFileSync(path.join(accountsDir, f.replace(".html", "_preview.html")), previewHtml, "utf8");
      console.log(`  ✔ Rebuilt accounts: ${f}`);
    }
  }

  console.log("\n✔ All preview HTML files successfully rebuilt with inlined CSS and correct wrappers!");
}

main().catch(console.error);
