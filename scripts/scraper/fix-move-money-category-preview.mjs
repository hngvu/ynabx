import fs from "fs";
import path from "path";

const DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const MASTER_CSS = fs.readFileSync(path.resolve("scripts/scraper/output/css/all-ynab.css"), "utf8");

const html = fs.readFileSync(path.join(DIR, "dropdown_move_money_select_category.html"), "utf8");

const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Move Money - Select Category Dropdown - YNAB Component</title>
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
      overflow: visible !important;
    }
    .dropdown-modal {
      display: block !important;
    }
  </style>
</head>
<body class="ember-application">
  ${html}
</body>
</html>`;

fs.writeFileSync(path.join(DIR, "dropdown_move_money_select_category_preview.html"), previewHtml, "utf8");
console.log("Updated dropdown_move_money_select_category_preview.html");
