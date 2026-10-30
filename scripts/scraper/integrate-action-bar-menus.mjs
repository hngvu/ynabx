import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
const MODALS_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const INDEX_PATH = path.resolve("scripts/scraper/output/index.html");

const moreMenuHtml = fs.readFileSync(path.join(MODALS_DIR, "action_bar_more_menu.html"), "utf8");
const categorizeMenuHtml = fs.readFileSync(path.join(MODALS_DIR, "action_bar_categorize_menu.html"), "utf8");
const flagMenuHtml = fs.readFileSync(path.join(MODALS_DIR, "action_bar_flag_menu.html"), "utf8");

let appHtml = fs.readFileSync(APP_PATH, "utf8");

// 1. Add modal items for action bar menus inside #modal-wrapper
const newModals = `
    <!-- Action Bar More Menu -->
    <div id="modal-actionBarMore" class="modal-item">
      ${moreMenuHtml}
    </div>

    <!-- Action Bar Categorize Menu -->
    <div id="modal-actionBarCategorize" class="modal-item">
      ${categorizeMenuHtml}
    </div>

    <!-- Action Bar Flag Menu -->
    <div id="modal-actionBarFlag" class="modal-item">
      ${flagMenuHtml}
    </div>
`;

appHtml = appHtml.replace(
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">',
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">' + newModals
);

// 2. Add hook for Action Bar buttons in initAccountInteractions
const extraScript = `
      // Action Bar Button Click Handlers
      if (actionBar) {
        const moreBtn = actionBar.querySelector('button:has-text("More"), button[aria-label*="More"], .register-action-bar-inner button:last-child');
        if (moreBtn) {
          moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarMore');
          });
        }

        const catBtn = actionBar.querySelector('button:has-text("Categorize")');
        if (catBtn) {
          catBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarCategorize');
          });
        }

        const flagBtn = actionBar.querySelector('button:has-text("Flag")');
        if (flagBtn) {
          flagBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('actionBarFlag');
          });
        }

        const closeBtn = actionBar.querySelector('button:has-text("Transaction")');
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            checkboxes.forEach(cb => cb.classList.remove('is-checked'));
            actionBar.style.display = 'none';
          });
        }
      }
`;

appHtml = appHtml.replace('// Call init on load', extraScript + '\n    // Call init on load');
fs.writeFileSync(APP_PATH, appHtml, "utf8");
console.log("Updated ynab_assembled_app.html with Action Bar submenus!");

// Update index.html
let indexHtml = fs.readFileSync(INDEX_PATH, "utf8");
const newIndexCards = `
    <div class="card">
      <div class="card-title">Action Bar "... More" Menu</div>
      <div class="card-desc">Submenu with Match, Unmatch, Duplicate, Memo, Move to Account, Export, and Delete.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/action_bar_more_menu_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/action_bar_more_menu.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Action Bar "Flag" Menu</div>
      <div class="card-desc">Color flag selector popover (Red, Orange, Yellow, Green, Blue, Purple) with keyboard shortcuts.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/action_bar_flag_menu_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/action_bar_flag_menu.png" target="_blank">View PNG</a>
      </div>
    </div>
`;

if (!indexHtml.includes("action_bar_more_menu_preview.html")) {
  indexHtml = indexHtml.replace(
    'href="test_plan_modals/transaction_action_bar_preview.html"',
    'href="test_plan_modals/transaction_action_bar_preview.html"'
  ).replace(
    '</div>\n\n    <div class="card">\n      <div class="card-title">Date Picker Popover</div>',
    '</div>\n' + newIndexCards + '\n    <div class="card">\n      <div class="card-title">Date Picker Popover</div>'
  );
  fs.writeFileSync(INDEX_PATH, indexHtml, "utf8");
  console.log("Updated index.html with Action Bar More & Flag menus!");
}
