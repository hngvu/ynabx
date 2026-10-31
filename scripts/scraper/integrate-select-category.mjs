import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
const INDEX_PATH = path.resolve("scripts/scraper/output/index.html");
const MODALS_DIR = path.resolve("scripts/scraper/output/test_plan_modals");

const moveMoneyCategoryHtml = fs.readFileSync(path.join(MODALS_DIR, "dropdown_move_money_select_category.html"), "utf8");

let appHtml = fs.readFileSync(APP_PATH, "utf8");

// 1. Add top button in toolbar
const newBtn = `<button class="nav-btn" onclick="openModal('moveMoneyCategorySelect')">📋 Chọn DM Chuyển Tiền</button>\n      `;
if (!appHtml.includes("openModal('moveMoneyCategorySelect')")) {
  appHtml = appHtml.replace(
    '<button class="nav-btn" onclick="openModal(\'moveMoney\')">💸 Chuyển Tiền (Move Money)</button>',
    newBtn + '<button class="nav-btn" onclick="openModal(\'moveMoney\')">💸 Chuyển Tiền (Move Money)</button>'
  );
}

// 2. Add modal to #modal-wrapper
const newModal = `
    <!-- Move Money Select Category Dropdown Popover -->
    <div id="modal-moveMoneyCategorySelect" class="modal-item">
      ${moveMoneyCategoryHtml}
    </div>
`;

if (!appHtml.includes('id="modal-moveMoneyCategorySelect"')) {
  appHtml = appHtml.replace(
    '<div id="modal-wrapper" onclick="handleBackdropClick(event)">',
    '<div id="modal-wrapper" onclick="handleBackdropClick(event)">' + newModal
  );
}

// 3. Make clicking the category input in live move money popover switch to moveMoneyCategorySelect
const hookScript = `
      // Move Money category dropdown hook
      const moveMoneyToInput = document.querySelector('#modal-moveMoney input[role="combobox"], #modal-moveMoney .categories-dropdown-container');
      if (moveMoneyToInput) {
        moveMoneyToInput.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('moveMoneyCategorySelect');
        });
      }
`;

if (!appHtml.includes('moveMoneyToInput')) {
  appHtml = appHtml.replace('// Call init on load', hookScript + '\n    // Call init on load');
}

fs.writeFileSync(APP_PATH, appHtml, "utf8");
console.log("Updated ynab_assembled_app.html with Move Money Category Select!");

// 4. Update index.html
let indexHtml = fs.readFileSync(INDEX_PATH, "utf8");
const newIndexCards = `
    <div class="card">
      <div class="card-title">Move Money - Select Category Dropdown</div>
      <div class="card-desc">Interactive category picker when moving money: lists all Plan Categories grouped by Inflow, Bills, Needs, Wants with Available balances.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/dropdown_move_money_select_category_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/test_move_money_select_category.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Inspector - Multiple Categories Selected</div>
      <div class="card-desc">Budget inspector state when checking 2+ categories: displays combined October's Summary (Assigned, Activity, Available) and batch Auto-Assign.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/inspector_multiple_categories_selected_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/inspector_multiple_categories_selected.png" target="_blank">View PNG</a>
      </div>
    </div>
`;

if (!indexHtml.includes("dropdown_move_money_select_category_preview.html")) {
  indexHtml = indexHtml.replace(
    'href="test_plan_modals/popover_move_money_preview.html"',
    'href="test_plan_modals/popover_move_money_preview.html"'
  ).replace(
    '</div>\n\n    <div class="card">\n      <div class="card-title">Month Picker Popover</div>',
    '</div>\n' + newIndexCards + '\n    <div class="card">\n      <div class="card-title">Month Picker Popover</div>'
  );
  fs.writeFileSync(INDEX_PATH, indexHtml, "utf8");
  console.log("Updated index.html with Select Category cards!");
}
