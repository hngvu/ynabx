import fs from "fs";
import path from "path";

const DIR = path.resolve("scripts/scraper/output/test_plan_modals");
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
      margin: 0;
      padding: 40px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      box-sizing: border-box;
      font-family: Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .modal-overlay {
      position: relative !important;
      display: block !important;
      inset: auto !important;
      background: transparent !important;
    }
    .modal {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      margin: 20px auto !important;
      display: block !important;
    }
  </style>
</head>
<body class="ember-application">
  ${html}
</body>
</html>`;
}

// 1. Ensure popover_edit_category.html exists (from popover_category_edit_menu.html)
const editCatHtml = fs.readFileSync(path.join(DIR, "popover_category_edit_menu.html"), "utf8");
fs.writeFileSync(path.join(DIR, "popover_edit_category.html"), editCatHtml, "utf8");
fs.writeFileSync(path.join(DIR, "popover_edit_category_preview.html"), wrapInPreview(editCatHtml, "Edit Category Popover"), "utf8");

console.log("Ensured popover_edit_category files!");
