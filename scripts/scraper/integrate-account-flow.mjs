import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
const MODALS_DIR = path.resolve("scripts/scraper/output/test_plan_modals");
const INDEX_PATH = path.resolve("scripts/scraper/output/index.html");

const chooseModalHtml = fs.readFileSync(path.join(MODALS_DIR, "modal_add_account_choose.html"), "utf8");
const unlinkedModalHtml = fs.readFileSync(path.join(MODALS_DIR, "modal_add_unlinked_account.html"), "utf8");
const selectTypeModalHtml = fs.readFileSync(path.join(MODALS_DIR, "modal_select_account_type.html"), "utf8");
const unlinkedFilledModalHtml = fs.readFileSync(path.join(MODALS_DIR, "modal_add_unlinked_account_filled.html"), "utf8");

let appHtml = fs.readFileSync(APP_PATH, "utf8");

// Add top nav buttons for these new modals in the top assembly bar
const newTopNavButtons = `
      <button class="nav-btn" onclick="openModal('addAccountChoose')">➕ Add Account</button>
      <button class="nav-btn" onclick="openModal('addUnlinked')">📝 Unlinked Form</button>
      <button class="nav-btn" onclick="openModal('selectAccountType')">🏦 Account Type</button>
`;

// Insert into top bar
appHtml = appHtml.replace(
  '<button class="nav-btn" onclick="openModal(\'catEdit\')">⚙ Menu Category</button>',
  newTopNavButtons + '      <button class="nav-btn" onclick="openModal(\'catEdit\')">⚙ Menu Category</button>'
);

// Add modals to #modal-wrapper
const newModals = `
    <!-- Add Account Choose (Linked or Unlinked) -->
    <div id="modal-addAccountChoose" class="modal-item">
      ${chooseModalHtml}
    </div>

    <!-- Add Unlinked Account Form -->
    <div id="modal-addUnlinked" class="modal-item">
      ${unlinkedModalHtml}
    </div>

    <!-- Select Account Type Modal -->
    <div id="modal-selectAccountType" class="modal-item">
      ${selectTypeModalHtml}
    </div>

    <!-- Add Unlinked Account Form (Filled Example) -->
    <div id="modal-addUnlinkedFilled" class="modal-item">
      ${unlinkedFilledModalHtml}
    </div>
`;

appHtml = appHtml.replace(
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">',
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">' + newModals
);

// Add JS handler to wire up interactive clicks between modals
const interactiveScript = `
    // Add Account Flow Interactivity
    function initAddAccountFlow() {
      // Sidebar Add Account buttons
      document.querySelectorAll('.button-sidebar-add-account, button:has-text("Add Account"), .nav-add-account, button.button-sidebar-add-account').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openModal('addAccountChoose');
        });
      });

      // Inside addAccountChoose: Click "Add an Unlinked Account"
      const unlinkedBtn = document.querySelector('#modal-addAccountChoose button.secondary, #modal-addAccountChoose button:has-text("Add an Unlinked Account")');
      if (unlinkedBtn) {
        unlinkedBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('addUnlinked');
        });
      }

      // Inside addUnlinked: Click "Select account type..."
      const typeBtn = document.querySelector('#modal-addUnlinked .account-type-select-button');
      if (typeBtn) {
        typeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('selectAccountType');
        });
      }

      // Inside selectAccountType: Back button
      const typeBackBtn = document.querySelector('#modal-selectAccountType button[aria-label="Back"], #modal-selectAccountType button:first-child');
      if (typeBackBtn) {
        typeBackBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('addUnlinked');
        });
      }

      // Inside selectAccountType: Clicking an account type option selects it and goes to filled state
      document.querySelectorAll('#modal-selectAccountType button.account-type-option, #modal-selectAccountType li button').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('addUnlinkedFilled');
        });
      });

      // Inside addUnlinked: Back button goes back to addAccountChoose
      const unlinkedBackBtn = document.querySelector('#modal-addUnlinked button[aria-label="Back"], #modal-addUnlinked button:first-child');
      if (unlinkedBackBtn) {
        unlinkedBackBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('addAccountChoose');
        });
      }

      // Close buttons (X) inside modals
      document.querySelectorAll('#modal-addAccountChoose button[aria-label="Close"], #modal-addUnlinked button[aria-label="Close"], #modal-selectAccountType button[aria-label="Close"], #modal-addUnlinkedFilled button[aria-label="Close"]').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeModal();
        });
      });
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initAddAccountFlow);
    } else {
      initAddAccountFlow();
    }
`;

appHtml = appHtml.replace('// Call init on load', interactiveScript + '\n    // Call init on load');
fs.writeFileSync(APP_PATH, appHtml, "utf8");
console.log("Updated ynab_assembled_app.html with Add Account and Account Type flow!");

// Update index.html
let indexHtml = fs.readFileSync(INDEX_PATH, "utf8");
const newIndexCards = `
    <div class="card">
      <div class="card-title">Add Account - Choose Method</div>
      <div class="card-desc">Search for bank (Chase, Amex, BofA, Apple) or click 'Add an Unlinked Account'.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/modal_add_account_choose_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/modal_add_account_choose.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Add Unlinked Account Form</div>
      <div class="card-desc">Form modal with Nickname input, Account Type picker trigger, and Current Balance input.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/modal_add_unlinked_account_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/modal_add_unlinked_account.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Select Account Type Modal</div>
      <div class="card-desc">Grouped list: Cash Accounts (Checking, Savings, Cash), Credit Accounts (Credit Card, Line of Credit), Mortgages/Loans, Tracking.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/modal_select_account_type_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/modal_select_account_type.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Add Unlinked Account (Filled State)</div>
      <div class="card-desc">Completed form state with Checking selected, sample nickname, and balance filled.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/modal_add_unlinked_account_filled_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/modal_add_unlinked_account_filled.png" target="_blank">View PNG</a>
      </div>
    </div>
`;

if (!indexHtml.includes("modal_add_unlinked_account_preview.html")) {
  indexHtml = indexHtml.replace(
    'href="test_plan_modals/add_transaction_form_inline_preview.html"',
    'href="test_plan_modals/add_transaction_form_inline_preview.html"'
  ).replace(
    '</div>\n\n    <div class="card">\n      <div class="card-title">Add Transaction Inline Form</div>',
    '</div>\n' + newIndexCards + '\n    <div class="card">\n      <div class="card-title">Add Transaction Inline Form</div>'
  );
  fs.writeFileSync(INDEX_PATH, indexHtml, "utf8");
  console.log("Updated index.html with new Account Type cards!");
}
