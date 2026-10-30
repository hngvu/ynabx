import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
const MODALS_DIR = path.resolve("scripts/scraper/output/test_plan_modals");

const datePickerHtml = fs.readFileSync(path.join(MODALS_DIR, "popover_transaction_datepicker.html"), "utf8");
const payeeHtml = fs.readFileSync(path.join(MODALS_DIR, "combobox_payee_dropdown.html"), "utf8");
const catDropdownHtml = fs.readFileSync(path.join(MODALS_DIR, "combobox_category_dropdown.html"), "utf8");
const actionBarHtml = fs.readFileSync(path.join(MODALS_DIR, "transaction_action_bar.html"), "utf8");

let html = fs.readFileSync(APP_PATH, "utf8");

// 1. Add modal items to #modal-wrapper
const newModals = `
    <!-- Transaction Date Picker Popover -->
    <div id="modal-datePicker" class="modal-item">
      ${datePickerHtml}
    </div>

    <!-- Payee Combobox Dropdown -->
    <div id="modal-payeeDropdown" class="modal-item">
      ${payeeHtml}
    </div>

    <!-- Category Combobox Dropdown -->
    <div id="modal-catDropdown" class="modal-item">
      ${catDropdownHtml}
    </div>
`;

// Insert new modals right after <div id="modal-wrapper" onclick="handleBackdropClick(event)">
html = html.replace(
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">',
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">' + newModals
);

// 2. Insert Action Bar container inside #view-accounts
// Let's place it at the end of the accounts view or grid container
const actionBarInsertion = `
  <!-- Floating Transaction Action Bar -->
  <div id="live-action-bar" style="display: none; position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; box-shadow: 0 8px 30px rgba(0,0,0,0.35); border-radius: 8px;">
    ${actionBarHtml}
  </div>
`;

html = html.replace(
  '<div id="view-accounts" class="view-container">',
  '<div id="view-accounts" class="view-container">' + actionBarInsertion
);

// 3. Add script interactions for account register
const accountInteractions = `
    // Account register checkbox & action bar interaction
    function initAccountInteractions() {
      const checkboxes = document.querySelectorAll('#view-accounts .ynab-grid-body .ynab-grid-cell-checkbox button, #view-accounts .ynab-grid-body input[type="checkbox"]');
      const actionBar = document.getElementById('live-action-bar');

      checkboxes.forEach(cb => {
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          const isChecked = cb.classList.toggle('is-checked');
          const checkedCount = document.querySelectorAll('#view-accounts .ynab-grid-body .ynab-grid-cell-checkbox button.is-checked').length;
          if (checkedCount > 0 && actionBar) {
            actionBar.style.display = 'block';
            const countLabel = actionBar.querySelector('button, span, strong');
            if (countLabel && countLabel.innerText.includes('Transaction')) {
              countLabel.innerText = checkedCount + (checkedCount === 1 ? ' Transaction' : ' Transactions');
            }
          } else if (actionBar) {
            actionBar.style.display = 'none';
          }
        });
      });

      // Add Transaction row interactions
      const addTxBtn = document.querySelector('#view-accounts button.add-transaction, #view-accounts button:has-text("Add Transaction")');
      const addRow = document.querySelector('#view-accounts .ynab-grid-add-rows');

      // Hook click events on Add Transaction inputs
      const dateCell = document.querySelector('#view-accounts .ynab-grid-cell-date input, #view-accounts .ynab-grid-cell-date');
      if (dateCell) {
        dateCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('datePicker');
        });
      }

      const payeeCell = document.querySelector('#view-accounts .ynab-grid-cell-payeeName input, #view-accounts .ynab-grid-cell-payeeName');
      if (payeeCell) {
        payeeCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('payeeDropdown');
        });
      }

      const catCell = document.querySelector('#view-accounts .ynab-grid-cell-subCategoryName input, #view-accounts .ynab-grid-cell-subCategoryName');
      if (catCell) {
        catCell.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('catDropdown');
        });
      }
    }

    // Call init on load
    window.addEventListener('DOMContentLoaded', () => {
      initAccountInteractions();
    });
    // In case DOM already loaded
    initAccountInteractions();
`;

// Insert the JS snippet right before </script>
html = html.replace('</script>\n</body>', accountInteractions + '\n  </script>\n</body>');

fs.writeFileSync(APP_PATH, html, "utf8");
console.log("Successfully integrated Action Bar, DatePicker, Payee & Category Dropdown into ynab_assembled_app.html!");
